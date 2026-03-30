"use server";

import StagehandConfig from "@/stagehand.config";
import Browserbase from "@browserbasehq/sdk";
import { Stagehand } from "@browserbasehq/stagehand";
import { main } from "./main";

export async function runStagehand(url: string, sessionId?: string) {
  const stagehand = new Stagehand({
    ...StagehandConfig,
    browserbaseSessionID: sessionId,
  });
  await stagehand.init();
  const result = await main({ stagehand, url });
  await stagehand.close();
  return result;
}

export async function startBBSSession() {
  const browserbase = new Browserbase(StagehandConfig);
  const session = await browserbase.sessions.create({
    projectId: StagehandConfig.projectId!,
  });
  const debugUrl = await browserbase.sessions.debug(session.id);
  return {
    sessionId: session.id,
    debugUrl: debugUrl.debuggerFullscreenUrl,
  };
}

export async function getConfig() {
  const hasBrowserbaseCredentials =
    process.env.BROWSERBASE_API_KEY !== undefined &&
    process.env.BROWSERBASE_PROJECT_ID !== undefined;

  const hasLLMCredentials = process.env.AI_GATEWAY_API_KEY !== undefined;

  return {
    env: StagehandConfig.env,
    verbose: StagehandConfig.verbose,
    domSettleTimeout: StagehandConfig.domSettleTimeout,
    browserbaseSessionID: StagehandConfig.browserbaseSessionID,
    hasBrowserbaseCredentials,
    hasLLMCredentials,
  };
}
