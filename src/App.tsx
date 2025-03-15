import _ from 'lodash';
import React from 'react';
import { Button, Col, ConfigProvider, Flex, Input, List, notification, Row, theme } from 'antd';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import './App.css';

interface BaseTask {
  description: string;
  estimation: {
    days: number;
    hours: number;
    minutes: number;
  };
}

interface Task extends BaseTask {
  subTasks: BaseTask[];
}

const EMPTY_TASK: Task = {
  description: '',
  estimation: { days: 0, hours: 0, minutes: 0 },
  subTasks: [],
};

const EMPTY_SUBTASK: BaseTask = {
  description: '',
  estimation: { days: 0, hours: 0, minutes: 0 },
};

const App: React.FC = () => {
  const [tasks, setTasks] = React.useState<Task[]>([_.cloneDeep(EMPTY_TASK)]);

  const [api, contextHolder] = notification.useNotification();

  // 計算 Task 的總時間（來自 Subtask）
  const calculateTotalEstimation = (taskIndex: number) => {
    const updatedTasks = _.cloneDeep(tasks);
    const subTasks = updatedTasks[taskIndex].subTasks;

    if (subTasks.length > 0) {
      const totalEstimation = subTasks.reduce(
        (sum, subTask) => {
          sum.days += subTask.estimation.days;
          sum.hours += subTask.estimation.hours;
          sum.minutes += subTask.estimation.minutes;
          return sum;
        },
        { days: 0, hours: 0, minutes: 0 }
      );

      // 處理時間單位進位（60 分鐘 = 1 小時，24 小時 = 1 天）
      totalEstimation.hours += Math.floor(totalEstimation.minutes / 60);
      totalEstimation.minutes %= 60;

      totalEstimation.days += Math.floor(totalEstimation.hours / 24);
      totalEstimation.hours %= 24;

      updatedTasks[taskIndex].estimation = totalEstimation;
    }

    setTasks(updatedTasks);
  };

  // 新增 Task
  const addTask = () => {
    setTasks([...tasks, _.cloneDeep(EMPTY_TASK)]);
  };

  // 新增 Subtask
  const addSubTask = (taskIndex: number) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].subTasks.push(_.cloneDeep(EMPTY_SUBTASK));
    setTasks(updatedTasks);
    calculateTotalEstimation(taskIndex);
  };

  // 更新 Task 描述
  const updateTaskDescription = (index: number, description: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].description = description;
    setTasks(updatedTasks);
  };

  // 更新 Task 時間
  const updateTaskEstimation = (index: number, field: keyof Task['estimation'], value: number) => {
    const updatedTasks = [...tasks];
    updatedTasks[index].estimation[field] = value;
    setTasks(updatedTasks);
  };

  // 更新 Subtask 描述
  const updateSubtaskDescription = (taskIndex: number, subTaskIndex: number, description: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].subTasks[subTaskIndex].description = description;
    setTasks(updatedTasks);
  };

  // 更新 Subtask 時間
  const updateSubtaskEstimation = (
    taskIndex: number,
    subTaskIndex: number,
    field: keyof BaseTask['estimation'],
    value: number
  ) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].subTasks[subTaskIndex].estimation[field] = value;
    setTasks(updatedTasks);
    calculateTotalEstimation(taskIndex);
  };

  // 刪除 Task
  const deleteTask = (index: number) => {
    if (tasks.length === 1) {
      setTasks([EMPTY_TASK]);
    } else {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  // 刪除 Subtask
  const deleteSubTask = (taskIndex: number, subTaskIndex: number) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].subTasks.splice(subTaskIndex, 1);
    setTasks(updatedTasks);
  };

  // 格式化時間成 `1d3h20m`
  const formatTime = (estimation: BaseTask['estimation']) => {
    const { days, hours, minutes } = estimation;
    let result = '';
    if (days) result += `${days}d`;
    if (hours) result += `${hours}h`;
    if (minutes) result += `${minutes}m`;
    return result || '0m';
  };

  // 生成 Markdown 格式
  const generateMarkdown = async () => {
    let markdown = '## 待辦事項\n';

    // 合計總時間
    const totalEstimation = tasks.reduce(
      (sum, task) => {
        sum.days += task.estimation.days;
        sum.hours += task.estimation.hours;
        sum.minutes += task.estimation.minutes;

        // 處理進位
        sum.hours += Math.floor(sum.minutes / 60);
        sum.minutes %= 60;

        sum.days += Math.floor(sum.hours / 24);
        sum.hours %= 24;

        return sum;
      },
      { days: 0, hours: 0, minutes: 0 }
    );

    // 列出每個任務
    tasks.forEach((task) => {
      const taskTime = formatTime(task.estimation);
      markdown += `* [ ] \`${taskTime}\`: ${task.description}\n`;

      // 列出子任務
      task.subTasks.forEach((subTask) => {
        const subTaskTime = formatTime(subTask.estimation);
        markdown += `    * [ ] \`${subTaskTime}\`: ${subTask.description}\n`;
      });
    });

    markdown += '\n### 預計總估時\n';
    markdown += `\`${formatTime(totalEstimation)}\``;

    // 複製到剪貼簿
    try {
      await navigator.clipboard.writeText(markdown);
      api.success({
        message: '已成功複製到剪貼簿',
        description: 'Markdown 格式已複製到剪貼簿，可以直接貼上至指定文件。',
        duration: 5
      });
    } catch (error) {
      console.error('無法複製到剪貼簿:', error);
      api.error({
        message: '複製失敗',
        description: '無法將內容複製到剪貼簿，請重試。',
        duration: 5
      });
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      {contextHolder}

      <List
        size='small'
        header={<div>Task List</div>}
        footer={
          <>
            <Row>
              <Button type='default' onClick={addTask} icon={<PlusOutlined />} block>
                新增 Task
              </Button>
            </Row>

            <Row style={{ marginTop: '16px' }} />

            <Row>
              <Button type='primary' onClick={generateMarkdown} block>
                輸出 Markdown
              </Button>
            </Row>
          </>
        }
        bordered
        dataSource={tasks}
        renderItem={(task, index) => (
          <>
            {/* === Task 層 === */}
            <Row gutter={[8, 8]} style={{ marginTop: '16px', marginBottom: '8px', marginLeft: '8px', marginRight: '8px' }}>
              {/* 描述輸入框 */}
              <Col span={14}>
                <Input
                  value={task.description}
                  onChange={(e) => updateTaskDescription(index, e.target.value)}
                  placeholder='輸入任務內容'
                />
              </Col>

              {/* 天數 */}
              <Col span={3}>
                <Flex gap='small' align='center'>
                  <Input
                    type='number'
                    disabled={!!task.subTasks.length}
                    value={task.estimation.days}
                    min={0}
                    onChange={(e) =>
                      updateTaskEstimation(index, 'days', parseInt(e.target.value) || 0)
                    }
                    placeholder='0'
                  />
                  d
                </Flex>
              </Col>

              {/* 小時 */}
              <Col span={3}>
                <Flex gap='small' align='center'>
                  <Input
                    type='number'
                    disabled={!!task.subTasks.length}
                    value={task.estimation.hours}
                    min={0}
                    onChange={(e) =>
                      updateTaskEstimation(index, 'hours', parseInt(e.target.value) || 0)
                    }
                    placeholder='0'
                  />
                  h
                </Flex>
              </Col>

              {/* 分鐘 */}
              <Col span={3}>
                <Flex gap='small' align='center'>
                  <Input
                    type='number'
                    disabled={!!task.subTasks.length}
                    value={task.estimation.minutes}
                    min={0}
                    onChange={(e) =>
                      updateTaskEstimation(index, 'minutes', parseInt(e.target.value) || 0)
                    }
                    placeholder='0'
                  />
                  m
                </Flex>
              </Col>

              {/* 刪除按鈕 */}
              <Col span={1}>
                <Button
                  type='text'
                  shape='circle'
                  icon={<CloseOutlined />}
                  onClick={() => deleteTask(index)}
                />
              </Col>
            </Row>

            {/* === Subtask 層 === */}
            {task.subTasks.map((subTask, subIndex) => (
              <Row key={subIndex} gutter={[8, 8]} style={{ marginBottom: '8px', marginLeft: '8px', marginRight: '8px' }}>
                <Col span={1} />

                <Col span={13}>
                  <Input
                    value={subTask.description}
                    onChange={(e) =>
                      updateSubtaskDescription(index, subIndex, e.target.value)
                    }
                    placeholder='輸入子項內容'
                  />
                </Col>

                {/* 時間單位輸入框 */}
                <Col span={3}>
                  <Flex gap='small' align='center'>
                    <Input
                      type='number'
                      value={subTask.estimation.days}
                      min={0}
                      onChange={(e) =>
                        updateSubtaskEstimation(index, subIndex, 'days', parseInt(e.target.value) || 0)
                      }
                      placeholder='0'
                    />
                    d
                  </Flex>
                </Col>

                {/* 時間單位輸入框 */}
                <Col span={3}>
                  <Flex gap='small' align='center'>
                    <Input
                      type='number'
                      value={subTask.estimation.hours}
                      min={0}
                      onChange={(e) =>
                        updateSubtaskEstimation(index, subIndex, 'hours', parseInt(e.target.value) || 0)
                      }
                      placeholder='0'
                    />
                    h
                  </Flex>
                </Col>

                {/* 時間單位輸入框 */}
                <Col span={3}>
                  <Flex gap='small' align='center'>
                    <Input
                      type='number'
                      value={subTask.estimation.minutes}
                      min={0}
                      onChange={(e) =>
                        updateSubtaskEstimation(index, subIndex, 'minutes', parseInt(e.target.value) || 0)
                      }
                      placeholder='0'
                    />
                    m
                  </Flex>
                </Col>

                {/* 刪除按鈕 */}
                <Col span={1}>
                  <Button
                    type='text'
                    shape='circle'
                    icon={<CloseOutlined />}
                    onClick={() => deleteSubTask(index, subIndex)}
                  />
                </Col>
              </Row>
            ))}

            {/* === 新增 Subtask 按鈕 === */}
            <Row gutter={[8, 8]} style={{ marginBottom: '8px', marginLeft: '8px', marginRight: '8px' }}>
              <Col span={1} />

              <Col span={13}>
                <Button
                  type='default'
                  icon={<PlusOutlined />}
                  onClick={() => addSubTask(index)}
                  block
                  style={{ marginBottom: '16px' }}
                >
                  新增 Subtask
                </Button>
              </Col>
            </Row>
          </>
        )}
      />
    </ConfigProvider>
  );
};

export default App;
