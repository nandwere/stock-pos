// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Login attempt with email:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Resolved by middleware — never comes from the request body
    const merchantSlug = request.headers.get('x-merchant-slug');
    console.log('Login attempt for merchant slug:', merchantSlug);  

    if (!merchantSlug) {
      return NextResponse.json(
        { error: 'Merchant identifier missing' },
        { status: 400 }
      );
    }

    const result = await loginUser(email, password, merchantSlug);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: result.user
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}