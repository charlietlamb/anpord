import type { Repository } from "@anpord/schema/domain/codebase";
import type { EvalSource } from "@anpord/schema/domain/evals";
import { Input } from "@anpord/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@anpord/ui/components/ui/select";
import { LockSimpleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

/**
 * Where a repository source comes from.
 *
 * A list where GitHub is connected, the URL box where it is not. The box is
 * not a fallback so much as the general case: a public repository someone
 * does not own has no reason to appear in their account's list, and typing
 * its URL is the only way to reach it.
 */
export function RepositoryField({
  onChange,
  repositories,
  value,
}: {
  readonly onChange: (next: Extract<EvalSource, { kind: "repo" }>) => void;
  readonly repositories: readonly Repository[];
  readonly value: Extract<EvalSource, { kind: "repo" }>;
}) {
  const known = repositories.find((repo) => repo.url === value.url);

  return (
    <div className="grid gap-1.5">
      <div className="grid gap-1.5 sm:grid-cols-[2fr_1fr]">
        {repositories.length === 0 ? (
          <Input
            aria-label="Repository URL"
            onChange={(event) =>
              onChange({ ...value, url: event.target.value })
            }
            placeholder="https://github.com/owner/repo"
            value={value.url}
          />
        ) : (
          <Select
            items={repositories.map((repo) => ({
              label: repo.fullName,
              value: repo.url,
            }))}
            onValueChange={(url) => {
              const picked = repositories.find((repo) => repo.url === url);

              return picked === undefined
                ? undefined
                : /* The default branch comes with the choice: it is the one
                     the reader means by "the repo", and typing it again is a
                     chance to type it wrong. */
                  onChange({
                    kind: "repo",
                    ref: picked.defaultBranch,
                    url: picked.url,
                  });
            }}
            value={value.url === "" ? null : value.url}
          >
            <SelectTrigger aria-label="Repository" className="w-full">
              <SelectValue placeholder="Choose a repository" />
            </SelectTrigger>
            <SelectContent>
              {repositories.map((repo) => (
                <SelectItem key={repo.url} value={repo.url}>
                  {repo.fullName}
                  {repo.private ? (
                    <LockSimpleIcon className="ml-1 size-3 text-muted-foreground" />
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          aria-label="Branch, tag, or commit"
          onChange={(event) =>
            onChange({
              ...value,
              ref: event.target.value === "" ? null : event.target.value,
            })
          }
          placeholder={known?.defaultBranch ?? "main"}
          value={value.ref ?? ""}
        />
      </div>

      {repositories.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          <Link
            className="underline underline-offset-2 hover:no-underline"
            to="/settings/codebase"
          >
            Connect GitHub
          </Link>{" "}
          to pick from your repositories, including private ones.
        </p>
      ) : null}
    </div>
  );
}
