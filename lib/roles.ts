export type Role =
  | "admin"
  | "manager"
  | "device_manager"
  | "sales_manager"
  | "customer";

export type Panel = "admin" | "device" | "cm" | "sales";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Customer Manager",
  device_manager: "Device Manager",
  sales_manager: "Sales Manager",
  customer: "Customer",
};

const HOME_PATHS: Record<Role, string> = {
  admin: "/admin",
  manager: "/cm",
  device_manager: "/device",
  sales_manager: "/sales",
  customer: "/dashboard",
};

export function homeForRole(role: Role): string {
  return HOME_PATHS[role];
}

export function canOpenPanel(role: Role, panel: Panel): boolean {
  if (role === "admin") {
    return true;
  }

  switch (panel) {
    case "device":
      return role === "device_manager";
    case "cm":
      return role === "manager";
    case "sales":
      return role === "sales_manager";
    case "admin":
      return false;
  }
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ROLE_LABELS, value)
  );
}
