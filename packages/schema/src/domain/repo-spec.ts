export interface RepoSpec {
  readonly host: string;
  readonly owner: string;
  readonly ref: string | null;
  readonly repo: string;
}

const GITHUB = "github.com";

const SHORTHAND = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:@(.+))?$/;

const HOSTED =
  /^(?:https?:\/\/|git@)([^/:]+)[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/;

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
