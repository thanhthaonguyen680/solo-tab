/**
 * Tiếng vuốt (slide) nghe giống đàn thật hơn khi alphaTab phát:
 * - Ngón tay trượt từng phím → cao độ đi theo từng nấc nửa cung, không uốn trơn như cần rung.
 * - Chuỗi vuốt liền (5 → 7 → 5) chỉ gảy một lần: alphaTab không gảy lại nốt đích của vuốt legato, nên đoạn
 *   vuốt tiếp theo phải uốn trên nốt đang kêu (nốt đầu chuỗi) thay vì trên một nốt không phát ra tiếng.
 * Thời điểm bắt đầu trượt chỉnh qua settings.player.slide.shiftSlideDurationRatio (xem TabPlayer).
 *
 * Can thiệp vào hàm nội bộ của alphaTab (MidiFileGenerator._generateSlide) — chạy ở luồng chính,
 * nơi alphaTab dựng MIDI trước khi gửi cho bộ tổng hợp. Thiếu hàm đó (alphaTab đổi phiên bản) thì bỏ qua.
 */
type AlphaTab = typeof import("@coderline/alphatab");

type NoteLike = {
  slideOrigin: NoteLike | null;
  slideOutType: number;
  calculateRealValue(applyTranspositionPitches: boolean, applyHarmonic: boolean): number;
};
type Handler = { addNoteBend(track: number, tick: number, channel: number, key: number, value: number): void };
type Generator = {
  _handler: Handler;
  applyTranspositionPitches: boolean;
};
type GenerateSlide = (this: Generator, note: NoteLike, noteStart: number, noteDuration: unknown, noteKey: number, channel: number, tempo: number) => void;

const LEGATO_SLIDE = 2; // SlideOutType.Legato
let patched = false;

export function patchSlidePlayback(alphaTab: AlphaTab) {
  if (patched) return;
  const Gen = alphaTab.midi.MidiFileGenerator as unknown as {
    prototype: { _generateSlide?: GenerateSlide };
    _pitchValuePerSemitone?: number;
    getPitchWheel?: (bendValue: number) => number;
  };
  const original = Gen.prototype._generateSlide;
  const perSemitone = Gen._pitchValuePerSemitone;
  if (typeof original !== "function" || !perSemitone || typeof Gen.getPitchWheel !== "function") return;
  const center = Gen.getPitchWheel(0);
  patched = true;

  Gen.prototype._generateSlide = function (note, noteStart, noteDuration, noteKey, channel, tempo) {
    // Nốt này là đích của vuốt legato (không được gảy) → uốn tiếp trên nốt đầu chuỗi, cộng phần đã trượt tới
    let root = note;
    while (root.slideOrigin && root.slideOrigin.slideOutType === LEGATO_SLIDE) root = root.slideOrigin;
    let key = noteKey;
    let offset = 0;
    if (root !== note) {
      key = root.calculateRealValue(this.applyTranspositionPitches, true);
      offset = (noteKey - key) * perSemitone;
    }
    const handler = this._handler;
    const addNoteBend = handler.addNoteBend;
    handler.addNoteBend = (track, tick, ch, k, value) => {
      // Làm tròn về từng nửa cung: nghe như ngón tay đi qua từng phím
      const semitones = Math.round((value + offset - center) / perSemitone);
      addNoteBend.call(handler, track, tick, ch, k, center + semitones * perSemitone);
    };
    try {
      original.call(this, note, noteStart, noteDuration, key, channel, tempo);
    } finally {
      handler.addNoteBend = addNoteBend;
    }
  };
}
