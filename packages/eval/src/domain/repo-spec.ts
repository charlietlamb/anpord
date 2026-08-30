export interface RepoSpec {
  /** Where it is hosted. Kept so a repository that is not on GitHub survives
   * the round trip; shorthand has no host to keep, and defaults to GitHub. */
  readonly host: string;
  readonly owner: string;
  readonly ref: string | null;
  readonly repo: string;
}

const GITHUB = "github.com";

const SHORTHAND = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:@(.+))?$/;

const HOSTED =
  /^(?:https?:\/\/|git@)([^/:]+)[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

/**
 * Reads `owner/repo`, `owner/repo@ref`, or a clone url into its parts.
 *
 * The shorthand exists so a case names a repository the way a person says it
 * out loud, and so the ref travels with the name it belongs to rather than as
 * a second field that can drift from it.
 *
 * A clone url is still accepted, because a repository that is not on GitHub
 * has no shorthand and should not be locked out of an eval. Its host is kept
 * rather than assumed: rewriting a GitLab url to github.com would clone a
 * different repository, or none, and say neither.
 */
export const parseRepo = (spec: string): RepoSpec | null => {
  const trimmed = spec.trim();

  const shorthand = SHORTHAND.exec(trimmed);

  if (shorthand) {
    const [, owner, repo, ref] = shorthand;

    return owner === undefined || repo === undefined
      ? null
      : { host: GITHUB, owner, ref: ref ?? null, repo };
  }

  const hosted = HOSTED.exec(trimmed);

  if (hosted) {
    const [, host, owner, repo] = hosted;

    return host === undefined || owner === undefined || repo === undefined
      ? null
      : { host, owner, ref: null, repo };
  }

  return null;
};

export const cloneUrlOf = (repo: RepoSpec) =>
  `https://${repo.host}/${repo.owner}/${repo.repo}.git`;

export const formatRepo = (repo: RepoSpec) => {
  const named =
    repo.host === GITHUB
      ? `${repo.owner}/${repo.repo}`
      : `${repo.host}/${repo.owner}/${repo.repo}`;

  return repo.ref === null ? named : `${named}@${repo.ref}`;
};
