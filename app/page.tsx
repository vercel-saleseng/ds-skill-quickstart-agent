"use client";

import {
  getConfig,
  runStagehand,
  startBBSSession,
} from "@/app/api/stagehand/run";
import DebuggerIframe from "@/components/stagehand/debuggerIframe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { defineStepper } from "@stepperize/react";
import { useCallback, useEffect, useState } from "react";
import React from "react";

const { Stepper } = defineStepper(
  { id: "enter-url", title: "Enter URL" },
  { id: "running", title: "Analyzing" },
  { id: "results", title: "Results" }
);

type SitemapResult = {
  links: { label: string; href: string }[];
};

export default function Home() {
  const [config, setConfig] = useState<Awaited<
    ReturnType<typeof getConfig>
  > | null>(null);
  const [url, setUrl] = useState("");
  const [running, setRunning] = useState(false);
  const [debugUrl, setDebugUrl] = useState<string | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [sitemap, setSitemap] = useState<SitemapResult | null>(null);

  const fetchConfig = useCallback(async () => {
    const cfg = await getConfig();
    setConfig(cfg);
    const warnings: string[] = [];
    if (!cfg.hasLLMCredentials) {
      warnings.push(
        "No LLM credentials found. Edit stagehand.config.ts to configure your LLM client."
      );
    }
    if (!cfg.hasBrowserbaseCredentials) {
      warnings.push(
        "No BROWSERBASE_API_KEY or BROWSERBASE_PROJECT_ID found."
      );
    }
    if (warnings.length) setWarning(warnings.join("\n"));
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleRun = useCallback(
    async (stepper: { navigation: { goTo: (id: string) => void } }) => {
      if (!config || !url) return;

      setRunning(true);
      setError(null);
      setSitemap(null);
      stepper.navigation.goTo("running");

      try {
        let sid: string | undefined;
        if (config.env === "BROWSERBASE") {
          const session = await startBBSSession();
          setDebugUrl(session.debugUrl);
          setSessionId(session.sessionId);
          sid = session.sessionId;
        }
        const result = await runStagehand(url, sid);
        setSitemap(result);
        stepper.navigation.goTo("results");
      } catch (err) {
        setError((err as Error).message);
        stepper.navigation.goTo("enter-url");
      } finally {
        setRunning(false);
      }
    },
    [config, url]
  );

  if (config === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8 font-sans text-foreground">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-balance">
          Stagehand Site Analyzer
        </h1>
        <p className="mb-8 text-center text-muted-foreground">
          Enter a URL to view the page and extract its sitemap
        </p>

        <Stepper.Root className="w-full space-y-6" orientation="horizontal">
          {({ stepper }) => (
            <>
              <Stepper.List className="flex list-none items-center justify-between gap-2">
                {stepper.state.all.map((stepData, index) => {
                  const currentIndex = stepper.state.current.index;
                  const status =
                    index < currentIndex
                      ? "success"
                      : index === currentIndex
                        ? "active"
                        : "inactive";
                  const isLast = index === stepper.state.all.length - 1;
                  return (
                    <React.Fragment key={stepData.id}>
                      <Stepper.Item
                        step={stepData.id}
                        className="flex shrink-0 items-center gap-2"
                      >
                        <div
                          className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
                            status === "active"
                              ? "bg-primary text-primary-foreground"
                              : status === "success"
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {status === "success" ? "✓" : index + 1}
                        </div>
                        <span
                          className={`text-sm font-medium ${
                            status === "inactive"
                              ? "text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {stepData.title}
                        </span>
                      </Stepper.Item>
                      {!isLast && (
                        <div
                          className={`h-0.5 flex-1 ${
                            status === "success" ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </Stepper.List>

              {stepper.flow.switch({
                "enter-url": () => (
                  <Card className="p-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleRun(stepper);
                      }}
                      className="flex flex-col gap-4"
                    >
                      <label
                        htmlFor="url-input"
                        className="text-sm font-medium text-foreground"
                      >
                        Website URL
                      </label>
                      <Input
                        id="url-input"
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                      />
                      <Button type="submit" disabled={!url || running}>
                        Analyze Site
                      </Button>
                    </form>
                  </Card>
                ),
                running: () => (
                  <Card className="space-y-4 p-6">
                    <p className="text-center text-sm text-muted-foreground">
                      Analyzing{" "}
                      <span className="font-medium text-foreground">{url}</span>
                      ...
                    </p>
                    <DebuggerIframe
                      debugUrl={debugUrl}
                      env={config.env}
                    />
                  </Card>
                ),
                results: () => (
                  <Card className="space-y-4 p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-foreground">
                        Sitemap Results
                      </h2>
                      <Badge variant="secondary">
                        {sitemap?.links.length ?? 0} links
                      </Badge>
                    </div>
                    {sitemap && sitemap.links.length > 0 ? (
                      <ul className="max-h-80 space-y-2 overflow-y-auto">
                        {sitemap.links.map((link, i) => (
                          <li
                            key={i}
                            className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2"
                          >
                            <span className="text-sm font-medium text-foreground">
                              {link.label}
                            </span>
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              {link.href}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No links found.
                      </p>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSitemap(null);
                        setDebugUrl(undefined);
                        setSessionId(undefined);
                        stepper.navigation.goTo("enter-url");
                      }}
                    >
                      Analyze Another Site
                    </Button>
                  </Card>
                ),
              })}
            </>
          )}
        </Stepper.Root>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Error: {error}
          </div>
        )}
        {warning && (
          <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
            <strong>Warning:</strong> {warning}
          </div>
        )}

        {sessionId && (
          <div className="mt-4 text-center">
            <a
              href={`https://www.browserbase.com/sessions/${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              View Session on Browserbase
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
