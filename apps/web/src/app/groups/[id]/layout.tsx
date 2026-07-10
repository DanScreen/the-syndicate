import { GroupLayoutClient } from "@/components/group-layout-client";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function GroupLayout({ children, params }: Props) {
  const { id } = await params;
  return <GroupLayoutClient groupId={id}>{children}</GroupLayoutClient>;
}
