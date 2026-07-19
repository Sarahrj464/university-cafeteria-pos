import {
  openShift,
  closeShift,
  getActiveShift,
  getShiftSummary,
  listShifts,
} from '../services/shift.service.js';

export async function getActiveShiftHandler(req, res, next) {
  try {
    const shift = await getActiveShift(req.user.userId);
    if (!shift) {
      return res.json({ success: true, data: { active: false } });
    }
    res.json({ success: true, data: { active: true, shift } });
  } catch (err) {
    next(err);
  }
}

export async function openShiftHandler(req, res, next) {
  try {
    const { openingCash } = req.body;
    if (openingCash === undefined || openingCash === null || isNaN(openingCash) || openingCash < 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'A valid positive opening cash amount is required',
      });
    }

    const shift = await openShift(req.user.userId, parseFloat(openingCash));
    res.status(201).json({ success: true, data: { shift } });
  } catch (err) {
    next(err);
  }
}

export async function closeShiftHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { closingCash } = req.body;
    if (closingCash === undefined || closingCash === null || isNaN(closingCash) || closingCash < 0) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'A valid positive closing cash amount is required',
      });
    }

    const shift = await closeShift(id, parseFloat(closingCash));
    res.json({ success: true, data: { shift } });
  } catch (err) {
    next(err);
  }
}

export async function getShiftSummaryHandler(req, res, next) {
  try {
    const summary = await getShiftSummary(req.params.id);
    res.json({ success: true, data: { summary } });
  } catch (err) {
    next(err);
  }
}

export async function listShiftsHandler(req, res, next) {
  try {
    const { cashierId, status, limit } = req.query;
    const shifts = await listShifts({
      cashierId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    res.json({ success: true, data: { shifts } });
  } catch (err) {
    next(err);
  }
}
