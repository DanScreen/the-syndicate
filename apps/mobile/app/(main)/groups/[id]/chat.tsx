import { useAuth } from "@/auth/AuthProvider";
import { GroupThread } from "@/components/group-chat";
import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import { StyleSheet, View } from "react-native";

export default function GroupChatScreen() {
  const { token, user } = useAuth();
  const { data, markChatRead } = useGroupData();

  if (!token || !data) return null;

  return (
    <View style={styles.container}>
      <GroupThread
        groupId={data.group.id}
        token={token}
        currentUserId={user?.id}
        isOwner={data.isOwner}
        onRead={markChatRead}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
  },
});
