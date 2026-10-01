import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  RBAC_ROLES as DEFAULT_ROLES,
  RBAC_CATALOG_ITEMS as DEFAULT_CATALOG,
  RBAC_MODULES as DEFAULT_MODULES,
} from "@/constants/rbacData";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

const RBACContext = createContext(null);

const STORAGE_KEY = "crs_rbac_custom_v1";
const MENU_ROLES_KEY = "crs_rbac_menu_roles_v1";

// Role yang dilindungi dan tidak boleh dihapus dari sistem
export const SYSTEM_ROLE_IDS = [
  "super_admin",
  "legal_officer",
  "business_unit",
  "management",
  "internal_audit",
  "dps",
];

// Helper untuk memetakan akun login ke role ID di matriks RBAC
export function mapUserToRoleId(user) {
  if (!user) return null;
  if (user.role === "admin") return "super_admin";
  if (user.role === "business_unit") {
    if (user.business_unit_id) {
      return `bu_${user.business_unit_id.toLowerCase()}`;
    }
    return "business_unit";
  }
  return user.role;
}

export function RBACProvider({ children }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "admin";

  // State dasar
  const [catalogItems, setCatalogItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.catalogItems) && parsed.catalogItems.length > 0) {
          const existingIds = new Set(parsed.catalogItems.map((c) => c.id || c.code));
          const missingDefaults = DEFAULT_CATALOG.filter(
            (c) => !existingIds.has(c.id) && !existingIds.has(c.code)
          );
          return [...parsed.catalogItems, ...missingDefaults];
        }
      }
    } catch (e) {
      console.warn("Failed to load RBAC state from localStorage:", e);
    }
    return DEFAULT_CATALOG;
  });

  const [rawRoles, setRawRoles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.roles) && parsed.roles.length > 0) {
          return parsed.roles.map((r) => {
            const def = DEFAULT_ROLES.find((d) => d.id === r.id);
            if (def && !r.isCustom) {
              return { ...r, name: def.name, description: def.description, code: def.code };
            }
            return r;
          });
        }
      }
    } catch (e) {
      console.warn("Failed to load roles from localStorage:", e);
    }
    return DEFAULT_ROLES;
  });

  // State peran apa saja yang menu RBAC-nya aktif di sidebar
  const [rbacMenuRoles, setRbacMenuRoles] = useState(() => {
    try {
      const saved = localStorage.getItem(MENU_ROLES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    // Ambil dari butir rbac:access_menu di katalog jika ada
    const menuItem = DEFAULT_CATALOG.find(
      (ci) => ci.id === "rbac:access_menu" || ci.code === "rbac:access_menu"
    );
    return menuItem?.roles ? menuItem.roles : ["super_admin", "admin", "management"];
  });

  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [editMode, setEditMode] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModified, setIsModified] = useState(() => {
    return !!localStorage.getItem(STORAGE_KEY);
  });

  // Sinkronisasi awal dengan backend MongoDB jika ada konfigurasi tersimpan
  useEffect(() => {
    let isMounted = true;
    async function loadBackendRBAC() {
      try {
        const res = await api.get("/admin/rbac");
        if (isMounted && res.data?.data) {
          const backendData = res.data.data;
          if (backendData.catalogItems) {
            const existingIds = new Set(backendData.catalogItems.map((c) => c.id || c.code));
            const missingDefaults = DEFAULT_CATALOG.filter(
              (c) => !existingIds.has(c.id) && !existingIds.has(c.code)
            );
            setCatalogItems([...backendData.catalogItems, ...missingDefaults]);
          }
          if (backendData.roles) {
            setRawRoles(
              backendData.roles.map((r) => {
                const def = DEFAULT_ROLES.find((d) => d.id === r.id);
                if (def && !r.isCustom) {
                  return { ...r, name: def.name, description: def.description, code: def.code };
                }
                return r;
              })
            );
          }
          if (backendData.modules) setModules(backendData.modules);
          if (Array.isArray(backendData.rbacMenuRoles)) {
            setRbacMenuRoles(backendData.rbacMenuRoles);
          }
          setIsModified(true);
        }
      } catch (err) {
        // Fallback ke localStorage sudah aktif
      }
    }
    if (user) {
      loadBackendRBAC();
    }
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Simpan perubahan ke storage dan backend
  const persistState = useCallback(
    async (newRoles, newCatalog, newModules = modules, newMenuRoles = rbacMenuRoles) => {
      try {
        const payload = {
          roles: newRoles,
          catalogItems: newCatalog,
          modules: newModules,
          rbacMenuRoles: newMenuRoles,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem(MENU_ROLES_KEY, JSON.stringify(newMenuRoles));
        setIsModified(true);

        // Kirim ke backend API
        api.put("/admin/rbac", payload).catch((err) => {
          console.warn("Syncing RBAC to backend API notice:", err?.message || err);
        });
      } catch (e) {
        console.error("Failed to persist RBAC settings:", e);
      }
    },
    [modules, rbacMenuRoles]
  );

  // Hitung metrik dinamis untuk setiap role berdasarkan catalogItems terkini
  const roles = useMemo(() => {
    return rawRoles.map((role) => {
      const assignedItems = catalogItems.filter((item) => item.roles.includes(role.id));
      const accessCount = assignedItems.length;
      const uniqueModules = new Set(assignedItems.map((item) => item.module));
      const moduleCount = uniqueModules.size;

      return {
        ...role,
        accessCount,
        moduleCount,
        outsideCatalog: role.id === "super_admin" ? 1 : (role.outsideCatalog || 0),
        rbacMenuEnabled:
          role.id === "super_admin" ||
          rbacMenuRoles.includes(role.id) ||
          rbacMenuRoles.includes(role.name),
      };
    });
  }, [rawRoles, catalogItems, rbacMenuRoles]);

  // Statistik ringkasan global
  const stats = useMemo(() => {
    const totalRoles = roles.length;
    const totalCatalog = catalogItems.length;
    const rolesWithoutAccess = roles.filter((r) => r.accessCount === 0).length;
    const outsideCatalogCount = roles.reduce((acc, r) => acc + (r.outsideCatalog || 0), 0);
    const rbacMenuEnabledCount = roles.filter((r) => r.rbacMenuEnabled).length;

    return {
      totalRoles,
      totalCatalog,
      rolesWithoutAccess,
      outsideCatalogCount,
      rbacMenuEnabledCount,
    };
  }, [roles, catalogItems]);

  // Cek apakah akun pengguna berhak melihat dan membuka menu RBAC
  const hasRBACMenuAccess = useCallback(
    (targetUser) => {
      if (!targetUser) return false;
      // Super Admin selalu memiliki akses sebagai pengelola
      if (targetUser.role === "admin") return true;

      const roleId = mapUserToRoleId(targetUser);
      return (
        rbacMenuRoles.includes(roleId) ||
        rbacMenuRoles.includes(targetUser.role) ||
        roleId === "super_admin"
      );
    },
    [rbacMenuRoles]
  );

  // ON / OFF-kan Menu Navigasi RBAC untuk role tertentu
  const toggleRBACMenuForRole = useCallback(
    (roleId) => {
      if (!isSuperAdmin) {
        toast.error("Hanya Super Administrator yang berhak mengatur akses menu RBAC.");
        return;
      }

      if (roleId === "super_admin" || roleId === "admin") {
        toast.error("Menu RBAC untuk Super Administrator wajib selalu aktif demi keamanan.");
        return;
      }

      const targetRole = rawRoles.find((r) => r.id === roleId);
      const isCurrentlyEnabled = rbacMenuRoles.includes(roleId);

      const updatedMenuRoles = isCurrentlyEnabled
        ? rbacMenuRoles.filter((id) => id !== roleId)
        : [...rbacMenuRoles, roleId];

      setRbacMenuRoles(updatedMenuRoles);

      // Sinkronkan juga dengan item rbac:access_menu di catalogItems
      const updatedCatalog = catalogItems.map((item) => {
        if (item.id === "rbac:access_menu" || item.code === "rbac:access_menu") {
          return { ...item, roles: updatedMenuRoles };
        }
        return item;
      });
      setCatalogItems(updatedCatalog);

      persistState(rawRoles, updatedCatalog, modules, updatedMenuRoles);

      if (isCurrentlyEnabled) {
        toast.info(`Menu RBAC dinonaktifkan (OFF) untuk ${targetRole?.name || roleId}`);
      } else {
        toast.success(`Menu RBAC diaktifkan (ON) untuk ${targetRole?.name || roleId}`);
      }
    },
    [isSuperAdmin, rbacMenuRoles, rawRoles, catalogItems, modules, persistState]
  );

  // Cek apakah role memiliki izin butir tertentu
  const hasPermission = useCallback(
    (roleId, itemCode) => {
      const item = catalogItems.find((ci) => ci.id === itemCode || ci.code === itemCode);
      return item ? item.roles.includes(roleId) : false;
    },
    [catalogItems]
  );

  // 1. Toggle Hak Akses per Cell di Matriks
  const togglePermission = useCallback(
    (roleId, itemCode) => {
      if (!isSuperAdmin) {
        toast.error("Hanya Super Administrator yang berhak mengubah hak akses sistem.");
        return false;
      }

      const targetItem = catalogItems.find((ci) => ci.id === itemCode || ci.code === itemCode);
      const targetRole = roles.find((r) => r.id === roleId);

      if (!targetItem || !targetRole) {
        toast.error("Butir akses atau role tidak ditemukan.");
        return false;
      }

      const isCurrentlyGranted = targetItem.roles.includes(roleId);
      const updatedRoles = isCurrentlyGranted
        ? targetItem.roles.filter((id) => id !== roleId)
        : [...targetItem.roles, roleId];

      const newCatalog = catalogItems.map((item) =>
        (item.id === itemCode || item.code === itemCode) ? { ...item, roles: updatedRoles } : item
      );

      // Jika yang di-toggle adalah item menu RBAC, sinkronkan juga rbacMenuRoles!
      let newMenuRoles = rbacMenuRoles;
      if (targetItem.id === "rbac:access_menu" || targetItem.code === "rbac:access_menu") {
        newMenuRoles = updatedRoles;
        setRbacMenuRoles(newMenuRoles);
      }

      setCatalogItems(newCatalog);
      persistState(rawRoles, newCatalog, modules, newMenuRoles);

      if (isCurrentlyGranted) {
        toast.info(`Hak akses "${targetItem.name}" dicabut dari ${targetRole.name}`);
      } else {
        toast.success(`Hak akses "${targetItem.name}" diberikan kepada ${targetRole.name}`);
      }
      return true;
    },
    [isSuperAdmin, catalogItems, roles, rawRoles, rbacMenuRoles, modules, persistState]
  );

  // 2. Beri / Cabut seluruh izin pada satu modul untuk role tertentu
  const bulkToggleModule = useCallback(
    (roleId, moduleName, grantAll) => {
      if (!isSuperAdmin) {
        toast.error("Akses ditolak: Diperlukan hak Super Administrator.");
        return;
      }

      const targetRole = roles.find((r) => r.id === roleId);
      let newMenuRoles = rbacMenuRoles;

      const newCatalog = catalogItems.map((item) => {
        if (item.module !== moduleName) return item;
        const has = item.roles.includes(roleId);
        let updatedItemRoles = item.roles;
        if (grantAll && !has) {
          updatedItemRoles = [...item.roles, roleId];
        } else if (!grantAll && has) {
          updatedItemRoles = item.roles.filter((id) => id !== roleId);
        }

        if (item.id === "rbac:access_menu" || item.code === "rbac:access_menu") {
          newMenuRoles = updatedItemRoles;
        }

        return { ...item, roles: updatedItemRoles };
      });

      setRbacMenuRoles(newMenuRoles);
      setCatalogItems(newCatalog);
      persistState(rawRoles, newCatalog, modules, newMenuRoles);

      if (grantAll) {
        toast.success(`Seluruh butir modul "${moduleName}" diberikan kepada ${targetRole?.name}`);
      } else {
        toast.info(`Seluruh butir modul "${moduleName}" dicabut dari ${targetRole?.name}`);
      }
    },
    [isSuperAdmin, roles, catalogItems, rawRoles, rbacMenuRoles, modules, persistState]
  );

  // 3. Tambah Role Baru
  const addRole = useCallback(
    (newRoleData) => {
      if (!isSuperAdmin) {
        toast.error("Hanya Super Administrator yang berhak membuat role baru.");
        return null;
      }

      const slug =
        newRoleData.id ||
        `role_${newRoleData.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString().slice(-4)}`;

      // Cek duplikasi ID
      if (rawRoles.some((r) => r.id === slug)) {
        toast.error("ID Role sudah digunakan. Gunakan nama lain.");
        return null;
      }

      const newRole = {
        id: slug,
        name: newRoleData.name,
        desc: newRoleData.desc || "Role kustom tambahan dalam sistem CRS BSI Maslahat.",
        outsideCatalog: 0,
      };

      const newRoles = [...rawRoles, newRole];
      let newCatalog = catalogItems;

      // Salin wewenang dari role referensi jika dipilih
      if (newRoleData.copyFromRoleId) {
        newCatalog = catalogItems.map((item) => {
          if (item.roles.includes(newRoleData.copyFromRoleId)) {
            return { ...item, roles: [...item.roles, slug] };
          }
          return item;
        });
        setCatalogItems(newCatalog);
      }

      setRawRoles(newRoles);
      persistState(newRoles, newCatalog, modules, rbacMenuRoles);
      toast.success(`Role "${newRole.name}" berhasil dibuat.`);
      return newRole;
    },
    [isSuperAdmin, rawRoles, catalogItems, modules, rbacMenuRoles, persistState]
  );

  // 4. Update Role
  const updateRole = useCallback(
    (roleId, updatedData) => {
      if (!isSuperAdmin) {
        toast.error("Akses ditolak: Diperlukan hak Super Administrator.");
        return false;
      }

      const newRoles = rawRoles.map((r) =>
        r.id === roleId ? { ...r, ...updatedData } : r
      );

      setRawRoles(newRoles);
      persistState(newRoles, catalogItems, modules, rbacMenuRoles);
      toast.success(`Data role "${updatedData.name || roleId}" berhasil diperbarui.`);
      return true;
    },
    [isSuperAdmin, rawRoles, catalogItems, modules, rbacMenuRoles, persistState]
  );

  // 5. Hapus Role
  const deleteRole = useCallback(
    (roleId) => {
      if (!isSuperAdmin) {
        toast.error("Akses ditolak: Diperlukan hak Super Administrator.");
        return false;
      }

      if (SYSTEM_ROLE_IDS.includes(roleId)) {
        toast.error("Role inti sistem dilindungi dan tidak dapat dihapus!");
        return false;
      }

      const targetRole = rawRoles.find((r) => r.id === roleId);
      const newRoles = rawRoles.filter((r) => r.id !== roleId);

      // Bersihkan role dari seluruh butir katalog dan menu roles
      const newCatalog = catalogItems.map((item) => ({
        ...item,
        roles: item.roles.filter((id) => id !== roleId),
      }));
      const newMenuRoles = rbacMenuRoles.filter((id) => id !== roleId);

      setRawRoles(newRoles);
      setCatalogItems(newCatalog);
      setRbacMenuRoles(newMenuRoles);
      persistState(newRoles, newCatalog, modules, newMenuRoles);
      toast.success(`Role "${targetRole?.name || roleId}" berhasil dihapus.`);
      return true;
    },
    [isSuperAdmin, rawRoles, catalogItems, rbacMenuRoles, modules, persistState]
  );

  // 6. Tambah Butir Akses Baru
  const addCatalogItem = useCallback(
    (newItemData) => {
      if (!isSuperAdmin) {
        toast.error("Akses ditolak: Diperlukan hak Super Administrator.");
        return null;
      }

      const code = newItemData.id || newItemData.code;
      if (catalogItems.some((item) => item.id === code || item.code === code)) {
        toast.error(`Kode akses "${code}" sudah terdaftar.`);
        return null;
      }

      const newItem = {
        id: code,
        code: code,
        module: newItemData.module,
        name: newItemData.name,
        desc: newItemData.desc || "-",
        roles: Array.isArray(newItemData.roles) ? newItemData.roles : ["super_admin"],
      };

      const newCatalog = [newItem, ...catalogItems];
      setCatalogItems(newCatalog);
      persistState(rawRoles, newCatalog, modules, rbacMenuRoles);
      toast.success(`Butir akses "${newItem.name}" berhasil ditambahkan.`);
      return newItem;
    },
    [isSuperAdmin, catalogItems, rawRoles, modules, rbacMenuRoles, persistState]
  );

  // 7. Update Butir Akses
  const updateCatalogItem = useCallback(
    (itemCode, updatedData) => {
      if (!isSuperAdmin) {
        toast.error("Akses ditolak: Diperlukan hak Super Administrator.");
        return false;
      }

      const newCatalog = catalogItems.map((item) =>
        (item.id === itemCode || item.code === itemCode) ? { ...item, ...updatedData } : item
      );

      setCatalogItems(newCatalog);
      persistState(rawRoles, newCatalog, modules, rbacMenuRoles);
      toast.success(`Butir akses "${updatedData.name || itemCode}" diperbarui.`);
      return true;
    },
    [isSuperAdmin, catalogItems, rawRoles, modules, rbacMenuRoles, persistState]
  );

  // 8. Hapus Butir Akses
  const deleteCatalogItem = useCallback(
    (itemCode) => {
      if (!isSuperAdmin) {
        toast.error("Akses ditolak: Diperlukan hak Super Administrator.");
        return false;
      }

      const target = catalogItems.find((item) => item.id === itemCode || item.code === itemCode);
      const newCatalog = catalogItems.filter((item) => item.id !== itemCode && item.code !== itemCode);

      setCatalogItems(newCatalog);
      persistState(rawRoles, newCatalog, modules, rbacMenuRoles);
      toast.success(`Butir akses "${target?.name || itemCode}" berhasil dihapus.`);
      return true;
    },
    [isSuperAdmin, catalogItems, rawRoles, modules, rbacMenuRoles, persistState]
  );

  // 9. Reset ke Konfigurasi Standar
  const resetToDefault = useCallback(async () => {
    if (!isSuperAdmin) {
      toast.error("Hanya Super Administrator yang berhak mereset konfigurasi.");
      return;
    }

    setSaving(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MENU_ROLES_KEY);
      setCatalogItems(DEFAULT_CATALOG);
      setRawRoles(DEFAULT_ROLES);
      setModules(DEFAULT_MODULES);
      const defaultMenuRoles = ["super_admin", "admin", "management"];
      setRbacMenuRoles(defaultMenuRoles);
      setIsModified(false);

      await api.post("/admin/rbac/reset").catch(() => {});
      toast.success("Konfigurasi RBAC berhasil dikembalikan ke standar awal BRD.");
    } catch (e) {
      toast.error("Gagal mereset konfigurasi: " + (e?.message || "unknown"));
    } finally {
      setSaving(false);
    }
  }, [isSuperAdmin]);

  const value = {
    roles,
    catalogItems,
    modules,
    stats,
    rbacMenuRoles,
    hasRBACMenuAccess,
    toggleRBACMenuForRole,
    isSuperAdmin,
    editMode,
    setEditMode,
    isModified,
    saving,
    hasPermission,
    togglePermission,
    bulkToggleModule,
    addRole,
    updateRole,
    deleteRole,
    addCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    resetToDefault,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
  const ctx = useContext(RBACContext);
  if (!ctx) {
    throw new Error("useRBAC must be used within an RBACProvider");
  }
  return ctx;
}
