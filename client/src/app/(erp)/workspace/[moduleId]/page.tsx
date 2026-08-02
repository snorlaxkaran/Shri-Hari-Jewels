import { notFound } from "next/navigation";
import ModuleWorkspace from "@/app/(components)/workspace/ModuleWorkspace";
import {
  isWorkspaceModule,
  WORKSPACE_CONFIG,
} from "@/lib/onboarding/workspace-config";

type Props = {
  params: Promise<{ moduleId: string }>;
};

export default async function WorkspaceModulePage({ params }: Props) {
  const { moduleId } = await params;
  if (!isWorkspaceModule(moduleId)) {
    notFound();
  }

  return <ModuleWorkspace moduleId={moduleId} config={WORKSPACE_CONFIG[moduleId]} />;
}
