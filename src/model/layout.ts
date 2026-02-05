import type { ObjectEntity } from "./types";

const COLUMN_WIDTH = 280;
const ROW_HEIGHT = 180;
const PADDING_X = 80;
const PADDING_Y = 80;

export type Position = { x: number; y: number };

export const autoLayout = (objects: ObjectEntity[]): Record<string, Position> => {
  const count = objects.length;
  if (count === 0) return {};

  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const positions: Record<string, Position> = {};

  objects.forEach((object, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    positions[object.id] = {
      x: PADDING_X + column * COLUMN_WIDTH,
      y: PADDING_Y + row * ROW_HEIGHT,
    };
  });

  return positions;
};

export const nextGridPosition = (index: number): Position => {
  const columns = 3;
  const row = Math.floor(index / columns);
  const column = index % columns;
  return {
    x: PADDING_X + column * COLUMN_WIDTH,
    y: PADDING_Y + row * ROW_HEIGHT,
  };
};
