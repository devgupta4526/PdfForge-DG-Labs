# Graph Report - .  (2026-05-03)

## Corpus Check
- 102 files · ~61,654 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3318 nodes · 7187 edges · 39 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output


## Input Scope
- Requested: auto
- Resolved: all (source: default-auto)
- Included files: 102 · Candidates: recursive
- Excluded: 0 untracked · 0 ignored · 0 sensitive · 0 missing committed
## God Nodes (most connected - your core abstractions)
1. `warn()` - 149 edges
2. `ConfigNamespace` - 141 edges
3. `TemplateNamespace` - 115 edges
4. `shadow()` - 93 edges
5. `getStringOption()` - 85 edges
6. `Catalog` - 46 edges
7. `XFAObject` - 43 edges
8. `PartialEvaluator` - 41 edges
9. `unreachable()` - 39 edges
10. `getInteger()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `assert()` --calls--> `unreachable()`  [EXTRACTED]
  apps/web/public/pdfjs/pdf.worker.min.mjs → apps/web/public/pdfjs/pdf.worker.min.mjs  _Bridges community 11 → community 8_
- `bytesToString()` --calls--> `unreachable()`  [EXTRACTED]
  apps/web/public/pdfjs/pdf.worker.min.mjs → apps/web/public/pdfjs/pdf.worker.min.mjs  _Bridges community 0 → community 8_
- `stringToBytes()` --calls--> `unreachable()`  [EXTRACTED]
  apps/web/public/pdfjs/pdf.worker.min.mjs → apps/web/public/pdfjs/pdf.worker.min.mjs  _Bridges community 14 → community 8_
- `stringToPDFString()` --calls--> `stringToBytes()`  [EXTRACTED]
  apps/web/public/pdfjs/pdf.worker.min.mjs → apps/web/public/pdfjs/pdf.worker.min.mjs  _Bridges community 1 → community 14_
- `stringToAsciiOrUTF16BE()` --calls--> `stringToUTF16String()`  [EXTRACTED]
  apps/web/public/pdfjs/pdf.worker.min.mjs → apps/web/public/pdfjs/pdf.worker.min.mjs  _Bridges community 1 → community 3_

## Communities

### Community 0 - "Community 0"
Cohesion: 0
Nodes (385): A, AbortException, Acrobat, Acrobat7, ADBE_JSConsole, ADBE_JSDebugger, AddSilentPrint, AddViewerPreferences (+377 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (80): addLocallyCachedImageOps(), adjustMapping(), Annotation, AnnotationFactory, AppearanceStreamEvaluator, arrayBuffersToBytes(), ButtonWidgetAnnotation, Catalog (+72 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (67): adjustWidths(), amendFallbackToUnicode(), applyStandardFontGlyphMap(), Ascii85Stream, AsciiHexStream, CMapFactory, createBuiltInCMap(), createCmapTable() (+59 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (51): addChildren(), AstArgument, AstBinaryOperation, AstLiteral, AstMin, AstVariable, AstVariableDefinition, B (+43 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (33): Barcode, BehaviorOverride, Binder, Border, createDataNode(), createText(), DatasetReader, encodeToXmlString() (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (59): addHTML(), applyAssist(), Area, ariaLabel(), BooleanElement, Caption, CheckButton, checkDimensions() (+51 more)

### Community 6 - "Community 6"
Cohesion: 0.01
Nodes (2): ConfigNamespace, LZWStream

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (73): bullmqFileDeletionQueue(), bullmqScheduleFileDeletion(), memoryScheduleFileDeletion(), scheduleAttempt(), createQueueEvents(), createWorker(), getProducerConnection(), getQueue() (+65 more)

### Community 8 - "Community 8"
Cohesion: 0.02
Nodes (23): addHex(), AstNode, BaseLocalCache, BasePdfManager, BaseShading, BaseStream, BinaryCMapReader, BinaryCMapStream (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.02
Nodes (1): TemplateNamespace

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (25): ApiClientError, deletePdfPages(), PdfDeleteError, planDeletion(), combineRotations(), normaliseRotation(), PdfRotateError, rotatePdfPages() (+17 more)

### Community 11 - "Community 11"
Cohesion: 0.04
Nodes (27): assert(), ContextCache, convertBlackAndWhiteToRGBA(), convertToRGBA(), decodeAndClamp(), decodeBitmap(), decodeIAID(), decodeInteger() (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (79): createDbClient(), getDirectDb(), getRuntime(), readNumberEnv(), requireEnv(), client(), createApiKey(), deleteExpiredApiKeys() (+71 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (10): AlternateCS, CalGrayCS, CalRGBCS, CCITTFaxDecoder, CCITTFaxStream, DeviceCmykCS, DeviceRgbaCS, IndexedCS (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (10): CFFCompiler, CFFDict, CFFFDSelect, CFFOffsetTracker, CFFParser, CFFPrivateDict, CFFStrings, CFFTopDict (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.04
Nodes (10): ChunkedStream, ChunkedStreamManager, MessageHandler, NetworkPdfManager, PDFWorkerStream, PDFWorkerStreamRangeReader, PDFWorkerStreamReader, toHexUtil() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.08
Nodes (4): Builder, DatasetXMLParser, XFAParser, XMLParserBase

### Community 17 - "Community 17"
Cohesion: 0.1
Nodes (6): AESBaseCipher, ARCFourCipher, CipherTransformFactory, isArrayEqual(), PDF17, PDF20

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (1): LocaleSetNamespace

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (4): Color, getTransformMatrix(), Stipple, Util

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (3): CompositeGlyph, GlyfTable, Glyph

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (1): ConnectionSetNamespace

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (1): JpegImage

### Community 23 - "Community 23"
Cohesion: 0.18
Nodes (2): NullOptimizer, QueueOptimizer

### Community 24 - "Community 24"
Cohesion: 0.2
Nodes (1): Word64

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (1): ToUnicodeMap

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (1): TextState

### Community 27 - "Community 27"
Cohesion: 0.43
Nodes (1): AnnotationBorderStyle

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (1): CFFFont

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (1): Ref

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (1): DeviceRgbCS

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (1): XFAAttribute

### Community 33 - "Community 33"
Cohesion: 0.4
Nodes (2): AES128Cipher, AES256Cipher

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (1): LocalPdfManager

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (1): DeviceGrayCS

### Community 36 - "Community 36"
Cohesion: 0.4
Nodes (1): WorkerTask

### Community 38 - "Community 38"
Cohesion: 0.83
Nodes (1): ArithmeticDecoder

### Community 39 - "Community 39"
Cohesion: 0.5
Nodes (1): DecodingContext

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (1): EvalState

## Knowledge Gaps
- **Thin community `Community 6`** (2 nodes): `ConfigNamespace`, `LZWStream`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (1 nodes): `TemplateNamespace`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `LocaleSetNamespace`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `ConnectionSetNamespace`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `JpegImage`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `NullOptimizer`, `QueueOptimizer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Word64`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `ToUnicodeMap`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `TextState`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `AnnotationBorderStyle`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `CFFFont`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `Ref`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `DeviceRgbCS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `XFAAttribute`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `AES128Cipher`, `AES256Cipher`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `LocalPdfManager`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `DeviceGrayCS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `WorkerTask`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `ArithmeticDecoder`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `DecodingContext`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `EvalState`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ConfigNamespace` connect `Community 6` to `Community 0`, `Community 4`, `Community 3`, `Community 15`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `TemplateNamespace` connect `Community 9` to `Community 0`, `Community 3`, `Community 11`, `Community 4`, `Community 1`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `warn()` connect `Community 1` to `Community 0`, `Community 6`, `Community 13`, `Community 11`, `Community 2`, `Community 14`, `Community 29`, `Community 3`, `Community 8`, `Community 4`, `Community 5`, `Community 16`, `Community 27`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.01 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._