import { parentPort, workerData } from 'worker_threads';
import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import fs from 'fs';
import sleep from 'sleep-promise';

interface Task {
  taskId: string;
  data: any;
}

const CHUNK_SIZE = 500; // 한 번에 처리할 행의 수
const MEMORY_LIMIT = 1024 * 1024 * 1024; // 500MB
const CHECK_INTERVAL = 1000; // 1초마다 메모리 체크
const PAUSE_DURATION = 2000; // 2초 동안 일시 중지

type DataRow = [string, string, string, string, string, string];

function* dataGenerator(totalRows: number): Generator<DataRow, void, unknown> {
  const originalArray: DataRow = [
    'Castille',
    'castille@example.com',
    'Spain',
    'David',
    'david@example.com',
    'Sweden',
  ];
  for (let i = 0; i < totalRows; i++) {
    yield originalArray;
  }
}

async function generatePDFInChunks(totalRows: number, outputPath: string) {
  const doc = new jsPDF();
  const dataGen = dataGenerator(totalRows);
  let currentRow = 0;
  let isFirstChunk = true;
  let isPaused = false;

  const memoryCheckInterval = setInterval(() => {
    const memoryUsage = process.memoryUsage().heapUsed;
    console.log(
      '메모리 사용률',
      Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      'MB',
    );
    if (memoryUsage > MEMORY_LIMIT) {
      isPaused = true;
      console.log('메모리 사용량 높음. 작업 일시 중지.');
      setTimeout(() => {
        isPaused = false;
        console.log('작업 재개.');
      }, PAUSE_DURATION);
    }
  }, CHECK_INTERVAL);

  while (currentRow < totalRows) {
    if (isPaused) {
      console.log('작업 대기');
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 잠시 대기
      continue;
    }
    // console.log('currentRow ', currentRow);
    const chunk: RowInput[] = [];
    for (
      let i = 0;
      i < CHUNK_SIZE && currentRow < totalRows;
      i++, currentRow++
    ) {
      const nextValue = dataGen.next().value;
      if (nextValue) {
        chunk.push(nextValue);
      }
    }

    if (isFirstChunk) {
      autoTable(doc, {
        head: [['Name', 'Email', 'Country', 'Name', 'Email', 'Country']],
        body: chunk,
      });
      isFirstChunk = false;
    } else {
      autoTable(doc, {
        body: chunk,
        startY: (doc as any).lastAutoTable.finalY || 10,
      });
    }

    // 메모리 사용량 체크 및 가비지 컬렉션

    await new Promise((resolve) => setImmediate(resolve)); // 비동기 작업을 위한 지연
  }
  console.log('[완료 ],', outputPath);

  clearInterval(memoryCheckInterval);

  // PDF를 파일로 저장
  doc.save(outputPath);
  // fs.writeFileSync(outputPath, doc.output());
  console.log('PDF generation completed');
}

parentPort.on('message', async (data: Task) => {
  try {
    console.log('작업 시작');
    await generatePDFInChunks(86400, process.cwd() + '/output.pdf');
    console.log('작업 끝');
    // parentPort.postMessage({
    //   taskId: data.taskId,
    //   result: 'PDF generation completed',
    // });
  } catch (error) {
    parentPort.postMessage({ taskId: data.taskId, error: error.message });
  }
});
