import { Redirect } from "expo-router";

/** Legacy route — preferences live on Account. */
export default function NotificationsRedirect() {
  return <Redirect href="/(main)/account" />;
}
