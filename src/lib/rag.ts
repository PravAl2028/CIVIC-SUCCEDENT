import { DEPARTMENTS, DepartmentEntry } from "../data/knowledge/departments";
import { RTI_TEMPLATES, LEGAL_RIGHTS, RTITemplate } from "../data/knowledge/rti";
import { GOVERNMENT_SCHEMES, getSchemeForDamageType, GovernmentScheme } from "../data/knowledge/schemes";

export interface RAGContext {
  department: DepartmentEntry | null;
  rtiTemplate: RTITemplate | null;
  legalRights: typeof LEGAL_RIGHTS;
  schemes: GovernmentScheme[];
  escalationPath: string[];
  responseTimeDays: number;
  allRelevantDepartments: DepartmentEntry[];
}

export function retrieveRAGContext(damageType: string, city: string, severity: number): RAGContext {
  const department = DEPARTMENTS.find(d => 
    d.handles.includes(damageType) && 
    d.city.toLowerCase() === city.toLowerCase()
  ) || DEPARTMENTS.find(d => d.handles.includes(damageType)) || null;

  const allRelevantDepartments = DEPARTMENTS.filter(d => d.handles.includes(damageType));

  const rtiCategory = severity >= 7 ? "escalation" : "municipal";
  const rtiTemplate = RTI_TEMPLATES.find(t => t.category === rtiCategory) || RTI_TEMPLATES[0];

  const severityKeywords: string[] = [];
  if (damageType === "pothole" || damageType === "crack") severityKeywords.push("road", "safety");
  if (damageType === "water_leak") severityKeywords.push("water", "environment");
  if (damageType === "broken_streetlight") severityKeywords.push("safety", "municipal");
  if (damageType === "garbage_dump") severityKeywords.push("environment", "health");
  if (damageType === "waterlogging") severityKeywords.push("drainage", "environment");
  if (damageType === "broken_infrastructure") severityKeywords.push("safety", "municipal");

  const legalRights = LEGAL_RIGHTS.filter(r => {
    if (severity >= 8 && r.title === "Right to Safety") return true;
    if (severity >= 7 && r.title === "Right to Clean Environment") return true;
    if (severity >= 6 && r.title === "Municipal Accountability") return true;
    return severityKeywords.some(kw => r.relevance.toLowerCase().includes(kw));
  });

  const schemes = getSchemeForDamageType(damageType);

  const escalationPath = department ? department.escalationPath : ["Ward Councillor", "Municipal Commissioner", "High Court (PIL)"];
  const responseTimeDays = department ? department.responseTimeDays : 30;

  return {
    department,
    rtiTemplate,
    legalRights: legalRights.length > 0 ? legalRights : LEGAL_RIGHTS.slice(0, 2),
    schemes,
    escalationPath,
    responseTimeDays,
    allRelevantDepartments
  };
}

export function buildRAGPrompt(damageType: string, city: string, severity: number, address: string, caseId: string): string {
  const ctx = retrieveRAGContext(damageType, city, severity);
  
  let prompt = `## RAG Knowledge Context for Civic Issue Resolution\n\n`;
  prompt += `**Issue Type**: ${damageType}\n**City**: ${city}\n**Severity**: ${severity}/10\n**Location**: ${address}\n**Case ID**: ${caseId}\n\n`;

  if (ctx.department) {
    prompt += `### Responsible Department\n`;
    prompt += `- **Name**: ${ctx.department.name}\n`;
    prompt += `- **Abbreviation**: ${ctx.department.abbreviation}\n`;
    prompt += `- **Contact**: ${ctx.department.contactEmail || "N/A"} | ${ctx.department.contactPhone || "N/A"}\n`;
    prompt += `- **Legal Basis**: ${ctx.department.legalBasis}\n`;
    prompt += `- **Expected Response Time**: ${ctx.department.responseTimeDays} days\n\n`;
  }

  prompt += `### Escalation Path\n`;
  ctx.escalationPath.forEach((step, i) => {
    prompt += `${i + 1}. ${step}\n`;
  });
  prompt += `\n`;

  if (ctx.rtiTemplate) {
    prompt += `### RTI Template\n`;
    prompt += `${ctx.rtiTemplate.template}\n`;
    prompt += `- **Fee**: ${ctx.rtiTemplate.fees}\n`;
    prompt += `- **Time Limit**: ${ctx.rtiTemplate.timeLimit}\n`;
    prompt += `- **Penalties**: ${ctx.rtiTemplate.penalties}\n\n`;
  }

  prompt += `### Applicable Legal Rights\n`;
  ctx.legalRights.forEach(r => {
    prompt += `- **${r.title}** (${r.act}): ${r.description}\n`;
  });

  if (ctx.schemes.length > 0) {
    prompt += `\n### Relevant Government Schemes\n`;
    ctx.schemes.forEach(s => {
      prompt += `- **${s.name}** (${s.abbreviation}) — ${s.ministry}\n`;
      prompt += `  ${s.description}\n`;
      prompt += `  Portal: ${s.officialPortal}\n`;
    });
  }

  return prompt;
}
