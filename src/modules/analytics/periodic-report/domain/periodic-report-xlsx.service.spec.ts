import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { PeriodicReportXlsxService } from './periodic-report-xlsx.service';

function countDarkPixels(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const pixels = ctx.getImageData(x, y, width, height).data;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    const isDark =
      pixels[i] < 120 || pixels[i + 1] < 120 || pixels[i + 2] < 120;
    if (alpha > 0 && isDark) {
      count++;
    }
  }

  return count;
}

describe('PeriodicReportXlsxService chart rendering', () => {
  it('renders chart titles, legends, and value labels into PNG output', async () => {
    const service = new PeriodicReportXlsxService() as unknown as {
      renderColumnChart(input: {
        title: string;
        labels: string[];
        series: Array<{ name: string; color: string; data: number[] }>;
        yMax?: number;
        valueSuffix?: string;
      }): Buffer;
    };

    const buffer = service.renderColumnChart({
      title: 'Completion Rate',
      labels: ['Completion', 'Point Completion', 'On-Time'],
      series: [
        {
          name: 'Rate %',
          color: '#10b981',
          data: [88.5, 72.25, 91],
        },
      ],
      yMax: 100,
      valueSuffix: '%',
    });

    const image = await loadImage(buffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    expect(countDarkPixels(ctx, 0, 0, image.width, 70)).toBeGreaterThan(50);
    expect(countDarkPixels(ctx, 330, 45, 240, 30)).toBeGreaterThan(15);
    expect(countDarkPixels(ctx, 120, 70, 720, 60)).toBeGreaterThan(20);
    expect(countDarkPixels(ctx, 120, 380, 720, 50)).toBeGreaterThan(20);
  });
});
