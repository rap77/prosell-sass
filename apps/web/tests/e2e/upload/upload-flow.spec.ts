import { test, expect } from '@playwright/test'

test.describe('Bulk Upload Flow', () => {
  test('uploads CSV with 50 valid vehicles', async ({ page }) => {
    // TODO: Navigate to /bulk-upload
    // TODO: Drop CSV file
    // TODO: Verify progress bar reaches 100%
    // TODO: Verify success message
  })

  test('validates CSV with wrong format', async ({ page }) => {
    // TODO: Upload invalid CSV
    // TODO: Verify error message appears
  })

  test('processes chunks in parallel', async ({ page }) => {
    // TODO: Upload 100 vehicles
    // TODO: Verify 2 chunks process simultaneously
  })
})

test.describe('Image Upload Flow', () => {
  test('drags and drops 5 images', async ({ page }) => {
    // TODO: Drag images to dropzone
    // TODO: Verify instant previews appear
    // TODO: Verify progress bars reach 100%
  })

  test('reorders images by dragging', async ({ page }) => {
    // TODO: Drag image 2 to position 1
    // TODO: Verify order changes
  })

  test('deletes individual image during upload', async ({ page }) => {
    // TODO: Click remove on image 3
    // TODO: Verify image disappears
  })
})
