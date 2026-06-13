/** Default branch when a user has no branch assignment (Head Office). */
export const DEFAULT_BRANCH_ID = "head-office";

export const SEED_BRANCHES = [
  {
    id: "head-office",
    name: "Head Office (Admin)",
    address: "123 Jewelry Street, Mumbai, Maharashtra",
    phone: "+91-9876543210",
    email: "headoffice@shreehari.com",
    manager: "Admin",
  },
  {
    id: "jaipur",
    name: "Jaipur Store",
    address: "MI Road, Jaipur, Rajasthan",
    phone: "+91-9876543211",
    email: "jaipur@shreehari.com",
    manager: "Jaipur Store Manager",
  },
  {
    id: "delhi",
    name: "Delhi Store",
    address: "Connaught Place, New Delhi",
    phone: "+91-9876543212",
    email: "delhi@shreehari.com",
    manager: "Delhi Store Manager",
  },
] as const;
