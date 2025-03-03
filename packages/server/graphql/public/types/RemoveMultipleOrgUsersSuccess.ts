import {KickedOutNotification} from '../../../postgres/types/Notification'
import {getUserId} from '../../../utils/authorization'
import isValid from '../../isValid'
import {RemoveMultipleOrgUsersSuccessResolvers} from '../resolverTypes'

export type RemoveMultipleOrgUsersSuccessSource = {
  removedUserIds: string[]
  removedOrgMemberIds: string[]
  removedTeamMemberIds: string[]
  affectedOrganizationId: string
  affectedOrganizationName: string
  affectedTeamIds: string[]
  affectedTaskIds: string[]
  affectedMeetingIds: string[]
  kickOutNotificationIds: string[]
}

const RemoveMultipleOrgUsersSuccess: RemoveMultipleOrgUsersSuccessResolvers = {
  affectedTasks: async ({affectedTaskIds}, _args, {dataLoader}) => {
    return (await dataLoader.get('tasks').loadMany(affectedTaskIds)).filter(isValid)
  },
  affectedMeetings: async ({affectedMeetingIds}, _args, {dataLoader}) => {
    return (await dataLoader.get('newMeetings').loadMany(affectedMeetingIds)).filter(isValid)
  },
  kickOutNotifications: async ({kickOutNotificationIds}, _args, {authToken, dataLoader}) => {
    const viewerId = getUserId(authToken)
    return (await dataLoader.get('notifications').loadMany(kickOutNotificationIds))
      .filter(isValid)
      .filter(({userId}) => userId === viewerId) as KickedOutNotification[]
  }
}

export default RemoveMultipleOrgUsersSuccess
