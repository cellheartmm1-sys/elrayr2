import { query } from '@/lib/db';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Run schema migration to ensure weight_percentage column exists
    await query(`
      ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) DEFAULT 0;
    `);

    const body = await request.json();
    const { 
      project_id, 
      phase_name, 
      phase_type, 
      description, 
      planned_start, 
      planned_end, 
      actual_start, 
      actual_end, 
      planned_progress = 0, 
      actual_progress = 0, 
      weight_percentage = 0,
      order_index = 0
    } = body;

    if (!project_id || !phase_name || !phase_type) {
      return NextResponse.json({ error: 'project_id, phase_name and phase_type are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO project_phases (
        project_id, phase_name, phase_type, description, 
        planned_start, planned_end, actual_start, actual_end, 
        planned_progress, actual_progress, weight_percentage, order_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        project_id, 
        phase_name, 
        phase_type, 
        description || null, 
        planned_start || null, 
        planned_end || null, 
        actual_start || null, 
        actual_end || null, 
        Number(planned_progress), 
        Number(actual_progress), 
        Number(weight_percentage),
        Number(order_index)
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    const err = error as Error;
    console.error('[POST /api/projects/phases]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Run schema migration to ensure weight_percentage column exists
    await query(`
      ALTER TABLE project_phases ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC(5,2) DEFAULT 0;
    `);

    const body = await request.json();
    const { 
      id, 
      phase_name, 
      phase_type, 
      description, 
      planned_start, 
      planned_end, 
      actual_start, 
      actual_end, 
      planned_progress, 
      actual_progress, 
      weight_percentage,
      order_index
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const checkRes = await query('SELECT * FROM project_phases WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Phase not found' }, { status: 404 });
    }
    const current = checkRes.rows[0];

    const result = await query(
      `UPDATE project_phases SET
        phase_name = $1,
        phase_type = $2,
        description = $3,
        planned_start = $4,
        planned_end = $5,
        actual_start = $6,
        actual_end = $7,
        planned_progress = $8,
        actual_progress = $9,
        weight_percentage = $10,
        order_index = $11
      WHERE id = $12 RETURNING *`,
      [
        phase_name ?? current.phase_name,
        phase_type ?? current.phase_type,
        description !== undefined ? description : current.description,
        planned_start !== undefined ? (planned_start || null) : current.planned_start,
        planned_end !== undefined ? (planned_end || null) : current.planned_end,
        actual_start !== undefined ? (actual_start || null) : current.actual_start,
        actual_end !== undefined ? (actual_end || null) : current.actual_end,
        planned_progress !== undefined ? Number(planned_progress) : Number(current.planned_progress),
        actual_progress !== undefined ? Number(actual_progress) : Number(current.actual_progress),
        weight_percentage !== undefined ? Number(weight_percentage) : Number(current.weight_percentage),
        order_index !== undefined ? Number(order_index) : Number(current.order_index),
        id
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    const err = error as Error;
    console.error('[PUT /api/projects/phases]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await query('DELETE FROM project_phases WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error('[DELETE /api/projects/phases]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
