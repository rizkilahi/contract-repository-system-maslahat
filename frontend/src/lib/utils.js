import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const OWNING_BUS_MAPPING = {
  "CRG": "Care and Rescue Group (CRG)",
  "CAG": "Charity Group (CAG)",
  "FSG": "Finance and Strategic Group (FSG)",
  "HCG": "Human Capital Group (HCG)",
  "PDG": "Product Development and Data Management Group (PDG)",
  "RNG": "Retail and Network Funding Group (RNG)",
  "DFG": "Digital Funding Group (DFG)",
  "BCG": "Budget Control Group (BCG)",
  "MCG": "Marketing Communication Group (MCG)",
  "IDG": "IT and Digital Group (IDG)",
  "IAG": "Internal Audit Group (IAG)",
  "CSG": "Corporate Secretary Group (CSG)",
  "LCG": "Legal and Compliance Group (LCG)",
  "EDG": "Empowerment and Development Program Group (EDG)",
  "WAG": "Wakaf Group (WAG)",
  "SMG": "Sharia Microfinance Institution Group (SMG)",
  "LEG": "Literation and Education Group (LEG)",
  "PGG": "Procurement and General Affair Group (PGG)"
};

export function getFullBUName(abbrev) {
  if (!abbrev) return "-";
  if (abbrev === "all") return "Semua BU";
  return OWNING_BUS_MAPPING[abbrev] || abbrev;
}
