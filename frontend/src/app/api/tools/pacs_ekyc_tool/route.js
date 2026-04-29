'use strict';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    const formData = await request.formData();
    const ekycForm = formData.get('ekycForm');
    const aadhaarCard = formData.get('aadhaarCard');
    const identityProof = formData.get('identityProof');

    if (!ekycForm || !aadhaarCard) {
      return NextResponse.json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'ekycForm and aadhaarCard are required'
        },
        meta: { contractVersion: 'v1' }
      }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append('ekycForm', ekycForm);
    backendFormData.append('aadhaarCard', aadhaarCard);
    if (identityProof) {
      backendFormData.append('identityProof', identityProof);
    }

    const response = await fetch(`${API_BASE_URL}/tools/pacs_ekyc_tool:v1/execute`, {
      method: 'POST',
      headers: session ? { 'Authorization': `Bearer ${session.user?.accessToken}` } : {},
      body: backendFormData,
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return NextResponse.json({
      success: false,
      data: null,
      error: {
        code: 'SERVER_ERROR',
        message: error.message
      },
      meta: { contractVersion: 'v1' }
    }, { status: 500 });
  }
}