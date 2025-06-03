import * as dotenv from 'dotenv';

export const pipelineConfig = (env: string) => {
  if (env === 'Production') {
    const { parsed } = dotenv.config({ path: '.env.production' });

    return {
      buildCommand: 'yarn build:prod',
      deployCommand: 'cdk deploy',
      branch: 'main',
      tag: 'chapter5-production-pipeline',
      githubToken: parsed?.GITHUB_TOKEN,
      workspaceId: 'T08UPLLMVSR',
      channelId: 'C08UPLLT729',
    };
  }

  const { parsed } = dotenv.config({ path: '.env.development' });

  return {
    buildCommand: 'yarn build:dev',
    deployCommand: 'cdk:dev deploy',
    branch: 'dev',
    tag: 'chapter5-development-pipeline',
    githubToken: parsed?.GITHUB_TOKEN,
    workspaceId: 'T08UPLLMVSR',
    channelId: 'C08UPLLT729',
  };
};
