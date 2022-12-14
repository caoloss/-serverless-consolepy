declare class TraceSpanTags extends Map {
  set(key: string, value: boolean | number | string | Date | Array): TraceSpanTags;
  setMany(
    tags: Record<string, boolean | number | string | Date | Array | Null>,
    options?: { prefix?: string }
  ): TraceSpanTags;
}

declare class TraceSpan {
  traceId: string;
  id: string;
  parentSpan: TraceSpan | null;
  subSpans: Set<TraceSpan>;
  spans: Set<TraceSpan>;
  tags: TraceSpanTags;
  input?: string;
  output?: string;

  close(): TraceSpan;
  closeContext(): undefined;
  destroy(): undefined;
  toJSON(): Object;
}

export default TraceSpan;
