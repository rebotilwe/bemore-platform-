import { runReport } from '../services/reportService.js';
import { track } from '../services/analyticsService.js';

export async function getReport(req, res, next) {
  try {
    const data = await runReport(req.params.name);

    track('report.generated', 'report', {
      actor: { type: 'admin', id: req.admin?.id },
      meta: { reportName: req.params.name, resultCount: data.count },
      req,
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
