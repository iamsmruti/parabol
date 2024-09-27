import {GraphQLID, GraphQLNonNull} from 'graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import getMeetingPhase from 'parabol-client/utils/getMeetingPhase'
import findStageById from 'parabol-client/utils/meetings/findStageById'
import {checkTeamsLimit} from '../../billing/helpers/teamLimitsCheck'
import getRethink from '../../database/rethinkDriver'
import TimelineEventPokerComplete from '../../database/types/TimelineEventPokerComplete'
import getKysely from '../../postgres/getKysely'
import {Logger} from '../../utils/Logger'
import {analytics} from '../../utils/analytics/analytics'
import {getUserId, isSuperUser, isTeamMember} from '../../utils/authorization'
import getPhase from '../../utils/getPhase'
import getRedis from '../../utils/getRedis'
import publish from '../../utils/publish'
import standardError from '../../utils/standardError'
import {GQLContext} from '../graphql'
import isValid from '../isValid'
import EndSprintPokerPayload from '../types/EndSprintPokerPayload'
import sendNewMeetingSummary from './helpers/endMeeting/sendNewMeetingSummary'
import gatherInsights from './helpers/gatherInsights'
import {IntegrationNotifier} from './helpers/notifications/IntegrationNotifier'
import removeEmptyTasks from './helpers/removeEmptyTasks'
import updateTeamInsights from './helpers/updateTeamInsights'

export default {
  type: new GraphQLNonNull(EndSprintPokerPayload),
  description: 'Finish a sprint poker meeting',
  args: {
    meetingId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The meeting to end'
    }
  },
  async resolve(_source: unknown, {meetingId}: {meetingId: string}, context: GQLContext) {
    const {authToken, socketId: mutatorId, dataLoader} = context
    const r = await getRethink()
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}
    const now = new Date()
    const viewerId = getUserId(authToken)

    // AUTH
    const meeting = await r.table('NewMeeting').get(meetingId).default(null).run()
    if (!meeting) return standardError(new Error('Meeting not found'), {userId: viewerId})
    if (meeting.meetingType !== 'poker') {
      return standardError(new Error('Meeting is not a poker meeting'), {userId: viewerId})
    }
    const {endedAt, facilitatorStageId, phases, teamId} = meeting

    // VALIDATION
    if (!isTeamMember(authToken, teamId) && !isSuperUser(authToken)) {
      return standardError(new Error('Not on team'), {userId: viewerId})
    }
    if (endedAt) return standardError(new Error('Meeting already ended'), {userId: viewerId})

    // RESOLUTION
    // remove hovering data from redis
    const estimatePhase = getPhase(phases, 'ESTIMATE')
    const {stages: estimateStages} = estimatePhase
    if (estimateStages.length > 0) {
      const redisKeys = estimateStages.map((stage) => `pokerHover:${stage.id}`)
      const redis = getRedis()
      // no need to await
      redis.del(...redisKeys)
    }
    const currentStageRes = findStageById(phases, facilitatorStageId)
    if (currentStageRes) {
      const {stage} = currentStageRes
      stage.isComplete = true
      stage.endAt = now
    }
    const phase = getMeetingPhase(phases)
    const storyCount = new Set(
      estimateStages.filter(({isComplete}) => isComplete).map(({taskId}) => taskId)
    ).size
    const discussionIds = estimateStages.map((stage) => stage.discussionId)
    const insights = await gatherInsights(meeting, dataLoader)
    const commentCounts = (
      await dataLoader.get('commentCountByDiscussionId').loadMany(discussionIds)
    ).filter(isValid)
    const commentCount = commentCounts.reduce((cumSum, count) => cumSum + count, 0)
    const completedMeeting = await r
      .table('NewMeeting')
      .get(meetingId)
      .update(
        {
          endedAt: now,
          phases,
          commentCount,
          storyCount,
          ...insights
        },
        {returnChanges: true, nonAtomic: true}
      )('changes')(0)('new_val')
      .default(null)
      .run()
    if (!completedMeeting) {
      return standardError(new Error('Completed poker meeting does not exist'), {
        userId: viewerId
      })
    }
    if (completedMeeting.meetingType !== 'poker') {
      return standardError(new Error('Meeting is not a poker meeting'), {userId: viewerId})
    }
    const {templateId} = completedMeeting
    const [meetingMembers, team, teamMembers, removedTaskIds, template] = await Promise.all([
      dataLoader.get('meetingMembersByMeetingId').load(meetingId),
      dataLoader.get('teams').loadNonNull(teamId),
      dataLoader.get('teamMembersByTeamId').load(teamId),
      removeEmptyTasks(meetingId),
      // technically, this template could have mutated while the meeting was going on. but in practice, probably not
      dataLoader.get('meetingTemplates').loadNonNull(templateId),
      updateTeamInsights(teamId, dataLoader)
    ])
    IntegrationNotifier.endMeeting(dataLoader, meetingId, teamId)
    analytics.sprintPokerEnd(completedMeeting, meetingMembers, template, dataLoader)
    const isKill = !!(phase && phase.phaseType !== 'ESTIMATE')
    if (!isKill) {
      sendNewMeetingSummary(completedMeeting, context).catch(Logger.log)
      checkTeamsLimit(team.orgId, dataLoader)
    }
    const events = teamMembers.map(
      (teamMember) =>
        new TimelineEventPokerComplete({
          userId: teamMember.userId,
          teamId,
          orgId: team.orgId,
          meetingId
        })
    )
    const pg = getKysely()
    await pg.insertInto('TimelineEvent').values(events).execute()

    const data = {
      meetingId,
      teamId,
      isKill,
      removedTaskIds
    }
    publish(SubscriptionChannel.TEAM, teamId, 'EndSprintPokerSuccess', data, subOptions)

    return data
  }
}
