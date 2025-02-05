import graphql from 'babel-plugin-relay/macro'
import {useEffect, useState} from 'react'
import {useDispatch} from 'react-redux'
import {useLazyLoadQuery, useMutation} from 'react-relay'

import {closeCreateTaskModal} from '../../reducers'

import Select from '../Select'
import SimpleSelect from '../SimpleSelect'

import {TipTapEditor} from 'parabol-client/components/promptResponse/TipTapEditor'
import useEventCallback from 'parabol-client/hooks/useEventCallback'
import {convertTipTapTaskContent} from 'parabol-client/shared/tiptap/convertTipTapTaskContent'
import type {TaskStatusEnum} from '../../__generated__/CreateTaskModalMutation.graphql'
import {CreateTaskModalMutation} from '../../__generated__/CreateTaskModalMutation.graphql'
import {CreateTaskModalQuery} from '../../__generated__/CreateTaskModalQuery.graphql'
import {useTipTapTaskEditor} from '../../hooks/useTipTapTaskEditor'
import LoadingSpinner from '../LoadingSpinner'
import Modal from '../Modal'

const TaskStatus: TaskStatusEnum[] = ['active', 'done', 'future', 'stuck']

const CreateTaskModal = () => {
  const data = useLazyLoadQuery<CreateTaskModalQuery>(
    graphql`
      query CreateTaskModalQuery {
        viewer {
          id
          teams {
            id
            name
            orgId
            teamMembers {
              id
              email
            }
          }
        }
      }
    `,
    {}
  )

  const {viewer} = data
  const {id: userId, teams} = viewer

  const [createTask, createTaskLoading] = useMutation<CreateTaskModalMutation>(graphql`
    mutation CreateTaskModalMutation($newTask: CreateTaskInput!) {
      createTask(newTask: $newTask) {
        task {
          id
        }
        error {
          message
        }
      }
    }
  `)

  const [selectedTeam, setSelectedTeam] = useState<NonNullable<typeof teams>[number]>()
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusEnum>('active')

  useEffect(() => {
    if (!selectedTeam && teams && teams.length > 0) {
      setSelectedTeam(teams[0])
    }
  }, [teams, selectedTeam])
  const teamId = selectedTeam?.id

  const dispatch = useDispatch()
  const handleClose = () => {
    dispatch(closeCreateTaskModal())
  }

  const handleSubmit = useEventCallback(async () => {
    if (!teamId || !selectedStatus || !editor || editor.isEmpty) {
      return
    }
    if (createTaskLoading) {
      return
    }

    const content = editor.getJSON()

    createTask({
      variables: {
        newTask: {
          content: JSON.stringify(content),
          status: selectedStatus,
          userId,
          teamId
        }
      }
    })

    handleClose()
  })

  const {editor} = useTipTapTaskEditor(convertTipTapTaskContent(''))
  if (!editor) {
    return null
  }

  return (
    <Modal
      title='Add a Task'
      commitButtonLabel='Add Task'
      handleClose={handleClose}
      handleCommit={handleSubmit}
    >
      <div className='absolute top-0 left-0 z-10 z-1050' />
      <div className='form-group'>
        <label className='control-label' htmlFor='description'>
          Description<span className='error-text'> *</span>
        </label>
        {/* className='channel-switch-modal' is a hack to not lose focus on key press, see 
            https://github.com/mattermost/mattermost/blob/dc06bb21558aca05dbe330f25459528b39247c32/webapp/channels/src/components/advanced_text_editor/use_textbox_focus.tsx#L63 */}
        <TipTapEditor
          id='description'
          className='channel-switch-modal form-control h-auto min-h-32 p-2'
          editor={editor}
          placeholder='Description'
        />
      </div>
      {teams ? (
        <Select
          label='Parabol Team'
          required={true}
          options={teams ?? []}
          value={selectedTeam}
          onChange={setSelectedTeam}
        />
      ) : (
        <LoadingSpinner />
      )}
      <SimpleSelect
        label='Status'
        required={true}
        options={TaskStatus}
        value={selectedStatus}
        onChange={setSelectedStatus}
      />
    </Modal>
  )
}

export default CreateTaskModal
