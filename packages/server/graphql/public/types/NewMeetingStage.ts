import GenericMeetingStage from '../../../database/types/GenericMeetingStage'
import {Logger} from '../../../utils/Logger'
import {getUserId} from '../../../utils/authorization'
import {NewMeetingPhaseTypeEnum, NewMeetingStageResolvers} from '../resolverTypes'

export interface NewMeetingStageSource extends GenericMeetingStage {
  meetingId: string
  teamId: string
  phaseType: NewMeetingPhaseTypeEnum
}

const NewMeetingStage: NewMeetingStageResolvers = {
  meeting: ({meetingId}, _args, {dataLoader}) =>
    dataLoader.get('newMeetings').loadNonNull(meetingId),

  phase: async ({meetingId, phaseType, teamId}, _args, {dataLoader}) => {
    const meeting = await dataLoader.get('newMeetings').loadNonNull(meetingId)
    const {phases} = meeting
    const phase = phases.find((phase) => phase.phaseType === phaseType)!
    return {...phase, meetingId, teamId}
  },

  isViewerReady: ({readyToAdvance}, _args, {authToken}) => {
    const viewerId = getUserId(authToken)
    return readyToAdvance?.includes(viewerId) ?? false
  },

  readyCount: async ({meetingId, readyToAdvance}, _args, {dataLoader}, ref) => {
    if (!readyToAdvance) return 0
    if (!meetingId) Logger.log('no meetingid', ref)
    const meeting = await dataLoader.get('newMeetings').loadNonNull(meetingId)
    const {facilitatorUserId} = meeting
    return readyToAdvance.filter((userId: string) => userId !== facilitatorUserId).length
  },

  timeRemaining: ({scheduledEndTime, id, meetingId}) => {
    if (scheduledEndTime) {
      if (!(scheduledEndTime instanceof Date)) {
        console.log('ENDTIME NOT DATE', scheduledEndTime, id, meetingId)
        return null
      }
      return scheduledEndTime.getTime() - Date.now()
    }
    return null
  }
}

export default NewMeetingStage
