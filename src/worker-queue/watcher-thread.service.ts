import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { resolve } from 'path';
import { Worker } from 'worker_threads';

export type Task = {
  id: string;
  data: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
};

@Injectable()
export class WatcherThreadService implements OnModuleInit {
  private logger = new Logger(WatcherThreadService.name);
  private taskQueue: Task[] = [];
  private worker: Worker | null = null;
  private isProcessing: boolean = false;
  constructor() {}

  onModuleInit() {
    this.createWorker();
  }
  // 작업을 큐에 추가하는 메서드
  addTask(taskData: string) {
    const taskId = Date.now().toString();
    const task: Task = {
      id: taskId,
      data: taskData,
      status: 'pending',
    };
    this.taskQueue.push(task);
    this.processNextTask();
    return taskId;
  }

  private createWorker() {
    const rootPath = resolve(__dirname, '../../');
    this.worker = new Worker(
      `${rootPath}/dist/worker-queue/watcher-worker.thread.js`,
      {
        workerData: {},
      },
    );

    this.worker.on('message', (data) => {
      this.handleWorkerMessage(data);
    });

    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${JSON.stringify(err)}`);
      this.handleWorkerExit();
    });

    this.worker.on('exit', (code) => {
      this.logger.log('Worker exited with code:', code);
      this.handleWorkerExit();
    });
  }
  private handleWorkerMessage(data: { taskId: string; result: any }) {
    const task = this.taskQueue.find((t) => t.id === data.taskId);
    if (task) {
      task.status = 'completed';
      task.result = data.result;
      this.logger.log(`Task ${task.id} completed:`, data.result);
    }
    this.taskQueue = this.taskQueue.filter((t) => t.id !== data.taskId);
    this.isProcessing = false;
    this.processNextTask();
  }

  private handleWorkerExit() {
    this.worker = null;
    this.isProcessing = false;
    // 실행 중이던 작업을 다시 대기열로 되돌림
    const runningTask = this.taskQueue.find((t) => t.status === 'running');
    if (runningTask) {
      runningTask.status = 'pending';
    }
    this.createWorker(); // 새 워커 생성
    this.processNextTask(); // 다음 작업 처리 시도
  }

  private processNextTask() {
    if (this.isProcessing || this.taskQueue.length === 0 || !this.worker)
      return;

    const nextTask = this.taskQueue.find((t) => t.status === 'pending');
    if (nextTask) {
      this.isProcessing = true;
      nextTask.status = 'running';
      this.worker.postMessage({ taskId: nextTask.id, data: nextTask.data });
    }
  }
  getTaskStatus(taskId: string): Task | undefined {
    return this.taskQueue.find((t) => t.id === taskId);
  }
}
