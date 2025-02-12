import type {GraphQLSchema} from 'graphql'
import type nestGitHubEndpoint from 'nest-graphql-endpoint/lib/nestGitHubEndpoint'
import '../../client/types/reactHTML4'
import type ScheduledJobMeetingStageTimeLimit from '../database/types/ScheduledJobMetingStageTimeLimit'
import type ScheduledTeamLimitsJob from '../database/types/ScheduledTeamLimitsJob'
export interface OAuth2Success {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

export interface OAuth2Error {
  error:
    | 'invalid_request'
    | 'invalid_client'
    | 'invalid_grant'
    | 'invalid_scope'
    | 'unauthorized_client'
    | 'unsupported_grant_type'
  error_description?: string
  error_uri?: string
}
export type ScheduledJobUnion = ScheduledJobMeetingStageTimeLimit | ScheduledTeamLimitsJob

export type RootSchema = GraphQLSchema & {
  githubRequest: ReturnType<typeof nestGitHubEndpoint>['githubRequest']
  gitlabRequest: ReturnType<typeof nestGitHubEndpoint>['githubRequest']
}
