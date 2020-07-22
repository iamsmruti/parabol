import graphql from 'babel-plugin-relay/macro'
import React, { useMemo } from 'react'
import { createFragmentContainer } from 'react-relay'

import styled from '@emotion/styled'

import { ActionMeetingUpdates_meeting } from '../__generated__/ActionMeetingUpdates_meeting.graphql'
import useAtmosphere from '../hooks/useAtmosphere'
import { AreaEnum } from '../types/graphql'
import isTaskPrivate from '../utils/isTaskPrivate'
import toTeamMemberId from '../utils/relay/toTeamMemberId'
import { ActionMeetingPhaseProps } from './ActionMeeting'
import ActionMeetingUpdatesPrompt from './ActionMeetingUpdatesPrompt'
import MeetingContent from './MeetingContent'
import MeetingHeaderAndPhase from './MeetingHeaderAndPhase'
import MeetingPhaseWrapper from './MeetingPhaseWrapper'
import MeetingTopBar from './MeetingTopBar'
import PhaseWrapper from './PhaseWrapper'
import PhaseCompleteTag from './RetroReflectPhase/PhaseCompleteTag'
import TaskColumns from './TaskColumns/TaskColumns'

const StyledColumnsWrapper = styled(MeetingPhaseWrapper)({
  position: 'relative'
})

/* InnerColumnsWrapper is a patch fix to ensure correct
   behavior for task columns overflow in small viewports TA */
const InnerColumnsWrapper = styled('div')({
  display: 'flex',
  overflow: 'auto',
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
})

interface Props extends ActionMeetingPhaseProps {
  meeting: ActionMeetingUpdates_meeting
}

const ActionMeetingUpdates = (props: Props) => {
  const {avatarGroup, toggleSidebar, meeting} = props
  const atmosphere = useAtmosphere()
  const {viewerId} = atmosphere
  const {id: meetingId, endedAt, localStage, showSidebar, team} = meeting
  console.log('ActionMeetingUpdates -> meeting', meeting)
  const {id: teamId, tasks} = team
  const {teamMember} = localStage!
  const {userId} = teamMember!
  const teamMemberTasks = useMemo(() => {
    return tasks.edges
      .map(({node}) => node)
      .filter((task) => task.userId === userId && !isTaskPrivate(task.tags))
  }, [tasks, userId])
  return (
    <MeetingContent>
      <MeetingHeaderAndPhase hideBottomBar={!!endedAt}>
        <MeetingTopBar
          avatarGroup={avatarGroup}
          isMeetingSidebarCollapsed={!showSidebar}
          toggleSidebar={toggleSidebar}
        >
          <ActionMeetingUpdatesPrompt meeting={meeting} />
        </MeetingTopBar>
        <PhaseWrapper>
          <PhaseCompleteTag isComplete />
          <StyledColumnsWrapper>
            <InnerColumnsWrapper>
              <TaskColumns
                area={AreaEnum.meeting}
                isMyMeetingSection={userId === viewerId}
                meetingId={meetingId}
                myTeamMemberId={toTeamMemberId(teamId, viewerId)}
                tasks={teamMemberTasks}
                teams={null}
              />
            </InnerColumnsWrapper>
          </StyledColumnsWrapper>
        </PhaseWrapper>
      </MeetingHeaderAndPhase>
    </MeetingContent>
  )
}

graphql`
  fragment ActionMeetingUpdatesStage on UpdatesStage {
    teamMember {
      userId
    }
  }
`

export default createFragmentContainer(ActionMeetingUpdates, {
  meeting: graphql`
    fragment ActionMeetingUpdates_meeting on ActionMeeting {
      ...ActionMeetingUpdatesPrompt_meeting
      id
      endedAt
      showSidebar
      localStage {
        ...ActionMeetingUpdatesStage @relay(mask: false)
      }
      phases {
        stages {
          ...ActionMeetingUpdatesStage @relay(mask: false)
        }
      }
      team {
        id
        tasks(first: 1000) @connection(key: "TeamColumnsContainer_tasks") {
          edges {
            node {
              ...TaskColumns_tasks
              # grab these so we can sort correctly
              id
              status
              sortOrder
              tags
              userId
            }
          }
        }
      }
    }
  `
})
