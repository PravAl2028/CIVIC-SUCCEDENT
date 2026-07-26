import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { getTranslatedDamageType, getTranslatedStatus } from "../lib/i18nHelpers";
import { getDepartmentForIssue } from "../data/knowledge/departments";
import { ArrowLeft, MapPin, AlertTriangle, CheckCircle2, Mail, Copy, Building2, Clock, Scale } from "lucide-react";

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { cases, user, handleTriggerDispatcher, activeDispatchCase, setActiveDispatchCase, dispatchLoading, dispatchLetter, triggerToast } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const issue = cases.find(c => c.id === id);

  const dept = issue ? getDepartmentForIssue(issue.damageType || "other", user?.city || "Hyderabad") : null;

  const handleEmailEscalation = () => {
    if (!issue) return;
    const issueType = (issue.damageType || "").replace("_", " ");
    const deptName = dept ? dept.name : "Municipal Corporation";
    const deptEmail = dept?.contactEmail || "";

    const subject = encodeURIComponent(`Urgent: ${issueType} at ${issue.address} - Case ${issue.id}`);
    const body = encodeURIComponent(
`To: ${deptName}
Subject: Request for Immediate Action - ${issueType}

Dear Sir/Madam,

I am writing to bring to your attention a ${issueType} at the following location:

Address: ${issue.address}
Severity: ${issue.severity}/10
Case Reference: ${issue.id}
Date Reported: ${issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : "N/A"}

${issue.description ? `Description: ${issue.description}` : ""}

${issue.verifications ? `This issue has been verified by ${issue.verifications} citizen(s).` : ""}

${dept ? `As per ${dept.legalBasis}, this falls under your jurisdiction.` : ""}

I kindly request your department to:
1. Acknowledge receipt of this complaint
2. Initiate repair/remediation within ${dept ? dept.responseTimeDays : 30} days
3. Share the name of the responsible officer

${dept ? `If no response is received within ${dept.responseTimeDays} days, I will be filing an application under the Right to Information Act, 2005.` : "If no response is received within 30 days, I will file an RTI application."}

Thank you for your attention to this matter.

Sincerely,
${user?.displayName || "Concerned Citizen"}
Nagarika Civic Reporting Platform
Case ID: ${issue.id}`
    );
    window.open(`mailto:${deptEmail}?subject=${subject}&body=${body}`, "_blank");
    triggerToast("Email draft opened!", "success");
  };

  if (!issue) return <div className="bg-[#F5F0E8] min-h-[100dvh] flex items-center justify-center text-zinc-400 text-sm">{t.issue.notFound}</div>;

  const statusColors: Record<string, string> = { resolved: "text-emerald-600", dispatched: "text-indigo-600", confirmed: "text-teal-600", reported: "text-amber-600" };

  return (
    <div className="bg-[#F5F0E8] min-h-[100dvh] text-[#191c22] font-sans pt-16 pb-24 px-4 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[#006a65] font-bold text-xs mb-4 cursor-pointer"><ArrowLeft className="w-4 h-4" /> {t.common.back}</button>
      {issue.imageUrl && <img src={issue.imageUrl} alt="" className="w-full h-48 object-cover rounded-2xl border border-zinc-200 mb-4" />}
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-lg font-black uppercase">{getTranslatedDamageType(issue.damageType, t)}</h1>
        <span className={`text-xs font-bold uppercase ${statusColors[issue.status] || ""}`}>{getTranslatedStatus(issue.status, t)}</span>
      </div>
      <div className="flex items-center gap-1 text-zinc-500 text-xs mb-3"><MapPin className="w-3 h-3" /> {issue.address}</div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white p-3 rounded-xl border border-zinc-200 text-center"><span className="text-lg font-black text-[#006a65] block">{issue.severity}/10</span><span className="text-[9px] uppercase font-bold text-zinc-400">{t.issue.severity}</span></div>
        <div className="bg-white p-3 rounded-xl border border-zinc-200 text-center"><span className="text-lg font-black text-zinc-800 block">{issue.verifications}</span><span className="text-[9px] uppercase font-bold text-zinc-400">{t.issue.verifications}</span></div>
        <div className="bg-white p-3 rounded-xl border border-zinc-200 text-center"><span className="text-lg font-black text-amber-500 block">{issue.fraudScore || 0}</span><span className="text-[9px] uppercase font-bold text-zinc-400">{t.issue.fraudScore}</span></div>
      </div>

      {dept && (
        <div className="bg-gradient-to-r from-[#006a65]/5 to-[#006a65]/10 rounded-2xl p-4 border border-[#006a65]/20 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-[#006a65]" />
            <span className="text-xs font-black text-[#006a65] uppercase">{t.issue.responsibleDept}</span>
          </div>
          <p className="text-xs font-bold text-zinc-700">{dept.name}</p>
          {dept.contactEmail && <p className="text-[10px] text-zinc-500 mt-0.5">{dept.contactEmail}</p>}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {dept.responseTimeDays} {t.issue.daysExpected}</span>
            <span className="text-[10px] text-zinc-500 flex items-center gap-1"><Scale className="w-3 h-3" /> {dept.legalBasis.split(";")[0]}</span>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 mb-4">
        <h3 className="text-xs font-bold uppercase text-zinc-400 mb-1">{t.issue.description}</h3>
        <p className="text-sm text-zinc-700">{issue.description || t.issue.noDescription}</p>
      </div>
      {issue.complaintLetter && (
        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 mb-4">
          <h3 className="text-xs font-bold uppercase text-zinc-400 mb-2">{t.issue.aiLetter}</h3>
          <pre className="text-[11px] text-zinc-600 whitespace-pre-wrap font-mono leading-relaxed">{issue.complaintLetter}</pre>
          {issue.rtiQuery && <div className="mt-3 pt-3 border-t border-zinc-200"><h4 className="text-[10px] font-bold uppercase text-zinc-400 mb-1">{t.issue.rtiQuery}</h4><p className="text-[11px] text-zinc-600">{issue.rtiQuery}</p></div>}
        </div>
      )}

      {dept && dept.escalationPath.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 mb-4">
          <h3 className="text-xs font-bold uppercase text-zinc-400 mb-2">{t.issue.escalationPath}</h3>
          <div className="space-y-1.5">
            {dept.escalationPath.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-600">
                <span className="w-5 h-5 rounded-full bg-[#006a65]/10 text-[#006a65] font-bold text-[10px] flex items-center justify-center flex-shrink-0">{i + 1}</span>
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {!issue.complaintGenerated && issue.status !== "resolved" && (
          <button onClick={() => handleTriggerDispatcher(issue.id)} className="flex-1 bg-[#006a65] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer">
            <Mail className="w-4 h-4" /> {t.issue.aiComplaint}
          </button>
        )}
        <button onClick={handleEmailEscalation} className="flex-1 bg-white border border-zinc-200 text-zinc-700 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-50">
          <Mail className="w-4 h-4" /> {t.issue.emailDept}
        </button>
      </div>

      {activeDispatchCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-2">
              <div>
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">{t.dispatch.aiSystem}</span>
                <h3 className="font-display text-lg font-black uppercase mt-1">{t.dispatch.draft}</h3>
              </div>
              <button onClick={() => setActiveDispatchCase(null)} className="text-zinc-400 hover:text-zinc-600 font-bold">{t.dispatch.close}</button>
            </div>
            {dispatchLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-[#006a65] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-zinc-500 font-bold">{t.dispatch.generating}</p>
              </div>
            ) : dispatchLetter ? (
              <div className="space-y-4">
                <div className="bg-[#fff9eb] border border-[#f0c040]/30 p-3.5 rounded-2xl">
                  <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">{t.dispatch.subject}</span>
                  <p className="text-xs font-black text-[#775a00] mt-0.5">{dispatchLetter.subject}</p>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-150 text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-line text-zinc-700 leading-relaxed">{dispatchLetter.complaintLetter}</div>
                {dispatchLetter.escalationPath && <div className="bg-[#f2f4fa] border border-indigo-100 p-3.5 rounded-2xl text-[11px] text-zinc-650 leading-relaxed"><p><strong>{t.issue.escalationLabel}</strong> {dispatchLetter.escalationPath}</p></div>}
                <button onClick={() => setActiveDispatchCase(null)} className="w-full bg-[#006a65] text-white py-3 rounded-xl font-bold text-xs uppercase">{t.dispatch.confirm}</button>
              </div>
            ) : <p className="text-xs text-rose-500">{t.dispatch.failed}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
