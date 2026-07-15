import { redirect } from "next/navigation";

/** Legacy URL — email List-Unsubscribe and old nav links. */
export default function NotificationsSettingsRedirect() {
  redirect("/account#notifications");
}
