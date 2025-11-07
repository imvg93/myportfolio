import { NextResponse } from 'next/server';
import { z } from 'zod';
import { storeResumeRequest } from '@/lib/supabase';

const RequestSchema = z.object({
	name: z.string().min(2, 'Name is required').max(120, 'Name is too long'),
	email: z.string().email('Valid email is required'),
});

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { name, email } = RequestSchema.parse(body);

		await storeResumeRequest(name.trim(), email.trim());

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		const message = err?.message || 'Failed to store resume request';
		const status = err?.status || 400;
		return NextResponse.json({ ok: false, error: message }, { status });
	}
}


