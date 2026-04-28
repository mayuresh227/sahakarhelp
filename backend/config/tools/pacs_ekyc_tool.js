'use strict';

const PACSEKYC_TOOL_CONFIG = {
  slug: 'pacs_ekyc_tool',
  name: 'PACS eKYC Tool',
  type: 'pacs_ekyc',
  version: 'v1',
  categories: ['kyc-tools', 'pacs', 'compliance'],
  description: 'Process and compress PACS eKYC documents (eKYC form, Aadhaar card, identity proof) into a single PDF under 250KB',
  engineType: 'pacs_ekyc',
  executionMode: 'async',
  sunsetDate: null,
  config: {
    inputs: [
      {
        name: 'ekycForm',
        type: 'file',
        label: 'eKYC Form',
        required: true,
        acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        description: 'Signed eKYC form (PDF or image)'
      },
      {
        name: 'aadhaarCard',
        type: 'file',
        label: 'Aadhaar Card',
        required: true,
        acceptedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        description: 'Aadhaar card image (will be preprocessed: cropped, grayscale, resized)'
      },
      {
        name: 'identityProof',
        type: 'file',
        label: 'Identity Proof',
        required: false,
        acceptedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        description: 'Additional identity proof (optional)'
      },
      {
        name: 'userConsent',
        type: 'boolean',
        label: 'User Consent',
        required: true,
        description: 'User consent for processing eKYC documents'
      },
      {
        name: 'consentVersion',
        type: 'string',
        label: 'Consent Version',
        required: false,
        description: 'Version of consent text (defaults to 1.0)'
      },
      {
        name: 'consentText',
        type: 'string',
        label: 'Consent Text',
        required: false,
        description: 'Full consent text (optional, for future version compatibility)'
      }
    ],
    outputs: [
      {
        name: 'fileUrl',
        type: 'string',
        label: 'File URL',
        description: 'URL to download the merged PDF'
      },
      {
        name: 'fileSizeKB',
        type: 'number',
        label: 'File Size (KB)',
        description: 'Final file size in kilobytes'
      },
      {
        name: 'success',
        type: 'boolean',
        label: 'Success',
        description: 'Whether the operation succeeded'
      }
    ]
  },
  processing: {
    imagePreprocessing: {
      aadhaarCard: {
        autoCrop: true,
        grayscale: true,
        maxWidth: 800,
        quality: 65
      },
      identityProof: {
        autoCrop: true,
        grayscale: true,
        maxWidth: 800,
        quality: 65
      }
    },
    pdfSettings: {
      pageSize: 'A4',
      width: 595,
      height: 842,
      whiteBackground: true,
      centerAligned: true
    },
    mergeOrder: ['ekycForm', 'aadhaarCard', 'identityProof'],
    compression: {
      targetSizeKB: 250,
      qualitySteps: [80, 70, 60, 50],
      fallbackDPI: 150,
      fallbackMaxDim: 1200,
      minDPI: 72,
      minMaxDim: 600
    }
  },
  safety: {
    preserveReadability: {
      ekycForm: true,
      aadhaarCard: true
    },
    noTextLoss: true
  },
  active: true,
  requiresAuth: false,
  requiredPlan: 'free',
  requiredRole: 'user',
  dailyLimitFree: 10,
  creditsPerExecution: 1,
  rateLimit: {
    windowMs: 60000,
    maxRequests: 10
  },
  sla: {
    failureRateThreshold: 0.1,
    sizeLimitThreshold: 0.15,
    windowMs: 300000,
    webhookUrl: process.env.SLA_WEBHOOK_URL || null
  },
  consent: {
    version: '1.0',
    text: 'I consent to the processing of my eKYC documents (eKYC Form, Aadhaar Card, and optional Identity Proof) for the purpose of PACS membership verification. My documents will be compressed and stored securely as per applicable data protection regulations.'
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['pacs', 'ekyc', 'aadhaar', 'kyc', 'compliance', 'cooperative']
  }
};

module.exports = PACSEKYC_TOOL_CONFIG;