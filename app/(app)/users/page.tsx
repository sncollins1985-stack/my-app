import { redirect } from "next/navigation";

export default function LegacyUsersRoutePage() {
  redirect("/administration/users");
}
