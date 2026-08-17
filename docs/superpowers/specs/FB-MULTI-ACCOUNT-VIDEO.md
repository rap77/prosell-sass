# Facebook Multi-Account Video Support

**Status**: DRAFT
**Created**: 2026-08-16
**Owner**: Backend Team + Frontend Team
**Priority**: High (Sprint A - Roadmap v5.0)
**Sprint**: Agosto 2026 sem 2-4
**Duration**: 3 weeks
**Investment**: $960

---

## Executive Summary

Completar infraestructura de Facebook Marketplace con **soporte nativo para videos**, permitiendo publicaciones con contenido multimedia completo (imágenes + videos).

**Impacto**:

- ✅ Multi-account OAuth FB **YA IMPLEMENTADO** (FacebookAccount entity, OAuth flow completo)
- ✅ Task Queue (Redis + Taskiq) **YA IMPLEMENTADO**
- ✅ Rate Limiting + Circuit Breaker **YA IMPLEMENTADO**
- ❌ **Video Upload + Transcoding Pipeline** → **FALTA IMPLEMENTAR** (feature crítica)
- ❌ **Video UI Support** → **FALTA IMPLEMENTAR**

---

## Context & Problem

### Current State (Aug 2026)

**Ya implementado** ✅:

1. Multi-account Facebook OAuth (FacebookAccount entity, token refresh)
2. Redis + Taskiq task queue
3. Rate limiting per-account + circuit breaker
4. Image optimization pipeline (resize, compress, CDN upload)

**Blocker actual** ❌:

- **Publicaciones solo soportan imágenes** (no videos)
- Dealers necesitan publicar videos de vehículos (tours 360°, test drives, detalles)
- Facebook Marketplace acepta videos, pero ProSell no puede procesarlos

### User Request

> "Necesitamos poder subir videos de los vehículos para las publicaciones de Facebook. Los clientes quieren ver el auto en movimiento, no solo fotos. Debería funcionar igual que las imágenes: arrastrar y soltar, preview, y automáticamente optimizado."

### Business Value

- **Mayor conversión**: Videos generan 3x más engagement que imágenes
- **Competitividad**: Dealers competidores ya publican con video
- **Eficiencia**: Procesamiento automático (no edición manual)
- **Compliance**: Videos cumplen specs FB Marketplace 2026

---

## Goals

### Must Have (Sprint A)

1. **Video Upload UI** - Drag & drop videos en PublishForm
2. **FFmpeg Transcoding Pipeline** - Videos optimizados según specs FB 2026
3. **CDN Upload** - Videos servidos desde Cloudflare R2 (o S3)
4. **Thumbnail Generation** - Preview frame extraído automáticamente
5. **Preview Component** - Mostrar video en preview de publicación

### Nice to Have (Post-Sprint)

- Watermark overlay con logo de organización
- Multiple video formats (actualmente solo MP4)
- Video editing básico (trim, crop)

### Non-Goals

- Live streaming
- Video analytics (views, completion rate)
- AI video generation
- Video SEO optimization

---

## Architecture

### Video Processing Pipeline

```
User Upload (MP4/MOV/AVI)
    ↓
Frontend Validation (max 4GB, 240 min)
    ↓
Upload to temp storage (presigned URL)
    ↓
Backend Task Queue (Taskiq)
    ↓
FFmpeg Transcoding
    ├── Target: MP4 (H.264 video, AAC audio)
    ├── Resolution: 1080x1080 (1:1) o 1080x1920 (9:16)
    ├── FPS: 30fps
    ├── Bitrate: Target 3-5MB para 60s
    └── Duration: Max 240 min (recomendar 60s)
    ↓
Thumbnail Extraction (frame @ 2s)
    ↓
CDN Upload (Cloudflare R2)
    ↓
DB Update (video_url, thumbnail_url, duration)
    ↓
Frontend Refresh (preview ready)
```

### Tech Stack

| Component        | Technology     | Version | Purpose                     |
| ---------------- | -------------- | ------- | --------------------------- |
| Video Processing | **FFmpeg**     | 6.0+    | Transcode, resize, compress |
| Task Queue       | Taskiq + Redis | Current | Async video processing      |
| Storage          | Cloudflare R2  | -       | CDN for videos + thumbnails |
| Frontend         | react-dropzone | Current | Video upload UI             |
| Backend          | Python 3.13    | -       | FFmpeg wrapper              |

### Data Model Changes

**ProductModel** - agregar campos:

```python
class ProductModel:
    # Existing fields...

    # NEW: Video support
    video_url: str | None  # CDN URL del video procesado
    video_thumbnail_url: str | None  # Frame de preview
    video_duration_seconds: int | None  # Duración en segundos
    video_status: str  # "pending" | "processing" | "ready" | "failed"
    video_error: str | None  # Error message si falló
```

**Migration**: `20260816_0001_add_product_video_fields.py`

---

## Facebook Marketplace Video Specs (2026)

Según documentación oficial FB Marketplace:

| Spec              | Value                              | Notes                          |
| ----------------- | ---------------------------------- | ------------------------------ |
| **Format**        | MP4                                | Container format               |
| **Video Codec**   | H.264                              | Main/High profile              |
| **Audio Codec**   | AAC                                | Stereo, 128kbps                |
| **Resolution**    | 1080x1080 (1:1) o 1080x1920 (9:16) | Square o vertical              |
| **Max Duration**  | 240 min                            | Recomendar 60s para conversión |
| **Max File Size** | 4GB                                | Target compress: 3-5MB/60s     |
| **FPS**           | 30fps                              | Constante                      |
| **Bitrate**       | Variable                           | Target ~500-800 kbps           |

---

## Implementation Plan

### Phase 1: Backend Video Processing (Week 1)

**Tasks**:

1. **Install FFmpeg** en Docker container
2. **Create VideoProcessingService**
   - `transcode_video(input_path, output_path, target_resolution)`
   - `extract_thumbnail(video_path, frame_second=2)`
   - `get_video_metadata(video_path)` → duration, resolution, codec
3. **Migration**: Agregar campos video a ProductModel
4. **Create UploadVideoUseCase**
   - Generar presigned URL para upload
   - Trigger Taskiq task para procesamiento
5. **Create ProcessVideoTask** (Taskiq)
   - Download from temp storage
   - Transcode con FFmpeg
   - Upload to CDN
   - Update ProductModel
6. **Tests**
   - Unit: VideoProcessingService
   - Integration: ProcessVideoTask end-to-end

**Acceptance Criteria**:

- [ ] FFmpeg installed y funcional
- [ ] Video transcoding completo (MP4 → MP4 optimizado)
- [ ] Thumbnail extraction funciona
- [ ] CDN upload funciona
- [ ] Task queue procesa video en < 2 min (60s video)

---

### Phase 2: Frontend Video Upload UI (Week 2)

**Tasks**:

1. **Extend ImageDropzone** → VideoDropzone
   - Accept video/* mime types
   - Show video preview (HTML5 `<video>`)
   - Show upload progress bar
2. **VideoPreview Component**
   - Play/pause controls
   - Duration display
   - Processing status (pending/processing/ready)
3. **Update PublishForm**
   - Video selector (radio: imagen principal o video principal)
   - Show video thumbnail + play button
4. **API Integration**
   - `useVideoUpload()` hook
   - Poll processing status
   - Show errors
5. **Tests**
   - Component: VideoDropzone
   - Integration: Upload flow E2E

**Acceptance Criteria**:

- [ ] Drag & drop video funciona
- [ ] Preview muestra video correctamente
- [ ] Progress bar actualiza durante upload
- [ ] Processing status visible para usuario
- [ ] Errors maneados gracefully

---

### Phase 3: Polish + Edge Cases (Week 3)

**Tasks**:

1. **Error Handling**
   - Timeout transcoding (> 10 min)
   - Invalid format detection
   - File size exceeded UI feedback
2. **Performance**
   - Lazy load videos (solo al scroll)
   - Thumbnail fallback si video no carga
3. **Validation**
   - Frontend: max duration, max size
   - Backend: codec validation, resolution check
4. **Documentation**
   - Update CLAUDE.md con video specs
   - API docs para video endpoints
5. **E2E Tests**
   - Playwright: Upload video → publish → verify FB
6. **Cleanup**
   - Delete temp videos después de procesamiento
   - CDN cleanup cronjob (videos de productos deleted)

**Acceptance Criteria**:

- [ ] Error messages claros y en español
- [ ] Performance OK (no lag con 10 videos)
- [ ] Validación funciona front + back
- [ ] E2E tests pasan
- [ ] Cleanup automático funciona

---

## API Endpoints

### 1. Upload Video (Presigned URL)

```http
POST /api/v1/products/{product_id}/video/upload-url
Authorization: Bearer <token>

Response: 200 OK
{
  "upload_url": "https://r2.cloudflare.com/...",
  "video_id": "uuid",
  "expires_at": "2026-08-16T12:00:00Z"
}
```

### 2. Get Video Status

```http
GET /api/v1/products/{product_id}/video/status
Authorization: Bearer <token>

Response: 200 OK
{
  "status": "processing",  // "pending" | "processing" | "ready" | "failed"
  "video_url": null,
  "thumbnail_url": null,
  "duration_seconds": null,
  "error": null,
  "progress_percent": 45
}
```

### 3. Delete Video

```http
DELETE /api/v1/products/{product_id}/video
Authorization: Bearer <token>

Response: 204 No Content
```

---

## FFmpeg Commands (Reference)

### Transcode to FB Marketplace Specs

```bash
ffmpeg -i input.mp4 \
  -vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k -ar 44100 \
  -r 30 \
  -movflags +faststart \
  -y output.mp4
```

### Extract Thumbnail

```bash
ffmpeg -i input.mp4 -ss 00:00:02 -vframes 1 -q:v 2 thumbnail.jpg
```

### Get Metadata

```bash
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4
```

---

## Success Metrics

| Metric                 | Target                  | How to Measure     |
| ---------------------- | ----------------------- | ------------------ |
| Video transcoding time | < 2 min para 60s video  | Task queue metrics |
| Video file size        | 3-5 MB para 60s         | Output file size   |
| Upload success rate    | > 95%                   | Error logs         |
| User adoption          | 30% productos con video | DB query           |
| Processing errors      | < 5%                    | Error rate         |

---

## Risks & Mitigations

| Risk                     | Impact    | Probability | Mitigation                                      |
| ------------------------ | --------- | ----------- | ----------------------------------------------- |
| FFmpeg server load alto  | 🔴 High   | 🟡 Medium   | Task queue + autoscaling, limit concurrent jobs |
| Video CDN costs elevados | 🟡 Medium | 🟡 Medium   | R2 pricing ($0.015/GB), 30-day TTL cleanup      |
| Transcoding timeouts     | 🟡 Medium | 🟡 Medium   | Max duration 240 min, timeout @ 10 min          |
| Invalid video formats    | 🟢 Low    | 🔴 High     | Frontend validation, FFmpeg error handling      |
| FB specs change          | 🟡 Medium | 🟢 Low      | Monitor FB docs, abstract FFmpeg commands       |

---

## Dependencies

**Blocker** (must be resolved first):

- Ninguno (todas las dependencias ya implementadas)

**Related Work**:

- ✅ Multi-account OAuth (ya implementado)
- ✅ Task Queue (ya implementado)
- ✅ Image optimization (reutilizar CDN upload)

---

## Testing Strategy

### Unit Tests

```python
# Backend
test_video_processing_service.py
  - test_transcode_video_to_fb_specs()
  - test_extract_thumbnail()
  - test_get_video_metadata()
  - test_invalid_format_raises_error()

test_upload_video_use_case.py
  - test_generate_presigned_url()
  - test_trigger_processing_task()
```

### Integration Tests

```python
test_process_video_task.py
  - test_end_to_end_video_processing()
  - test_cdn_upload_success()
  - test_processing_timeout_handling()
```

### E2E Tests (Playwright)

```typescript
test_video_upload_flow.spec.ts
  - Upload video → Wait processing → Verify preview
  - Upload invalid video → See error message
  - Upload too large video → Frontend validation blocks
```

---

## Out of Scope (Future Work)

- Watermark overlay con logo (post-MVP)
- AI video optimization (auto-trim, best frame selection)
- Multiple videos per producto (solo 1 por ahora)
- Video analytics (views, completion rate)
- Live streaming support

---

## References

- [Facebook Marketplace Video Specs](https://developers.facebook.com/docs/marketplace/video-requirements) (2026)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- Roadmap v5.0: `docs/ROADMAP-V5-FINAL-2026-07-21.md` líneas 119-189

---

## Changelog

- **2026-08-16**: Spec creada (DRAFT) - basada en roadmap v5.0 Sprint A
