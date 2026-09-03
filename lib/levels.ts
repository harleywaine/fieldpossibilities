/** The four opportunity levels (brief §5). Single source of truth for the shell. */

export type DataKind = 'real' | 'synthetic' | 'mixed';

export interface Level {
  n: 1 | 2 | 3 | 4;
  slug: string;
  href: string;
  verb: string;
  title: string;
  strap: string;
  description: string;
  example: string;
  status: string;
  dataKind: DataKind;
  dataLabel: string;
  complexity: 'Low' | 'Medium' | 'Medium–High' | 'High';
  value: string[];
  cta: string;
}

export const LEVELS: Level[] = [
  {
    n: 1, slug: 'customer-ai', href: '/customer-ai', verb: 'FIND',
    title: 'Customer Intelligence', strap: 'AI finds.',
    description: 'Help customers find the tooling they need using natural language.',
    example: 'Describe the tooling you need. AI finds the relevant products.',
    status: 'Working demonstration',
    dataKind: 'real', dataLabel: 'Real public Field catalogue data',
    complexity: 'Low',
    value: ['Easier customer discovery', 'Faster enquiries', 'Improved customer experience', 'Increased conversion potential'],
    cta: 'Try the demo',
  },
  {
    n: 2, slug: 'knowledge-ai', href: '/knowledge-ai', verb: 'UNDERSTAND',
    title: 'Knowledge Intelligence', strap: 'AI understands.',
    description: 'Give employees an intelligent interface to the company’s collective knowledge.',
    example: 'Ask what the business already knows about a customer, an enquiry or a process.',
    status: 'Working demonstration using synthetic internal data',
    dataKind: 'synthetic', dataLabel: 'Synthetic internal documents',
    complexity: 'Medium',
    value: ['Reduced research time', 'Faster onboarding', 'Knowledge retention', 'Faster customer response'],
    cta: 'Try the demo',
  },
  {
    n: 3, slug: 'workflow-ai', href: '/workflow-ai', verb: 'DO',
    title: 'Workflow Automation', strap: 'AI does.',
    description: 'Automatically turn incoming work into structured actions and recommendations.',
    example: 'An RFQ arrives. AI reads it, matches it and prepares the work package.',
    status: 'Working demonstration',
    dataKind: 'mixed', dataLabel: 'Synthetic RFQ matched against the real catalogue',
    complexity: 'Medium–High',
    value: ['Automated RFQ processing', 'Reduced administration', 'Fewer manual handoffs', 'Increased employee capacity'],
    cta: 'Try the demo',
  },
  {
    n: 4, slug: 'operating-layer', href: '/operating-layer', verb: 'OPTIMISE',
    title: 'AI Operating Layer', strap: 'AI optimises.',
    description: 'Connect information across the business to identify opportunities, bottlenecks and actions.',
    example: 'Ask where time and money are being lost, and what to do first.',
    status: 'Conceptual working demonstration',
    dataKind: 'synthetic', dataLabel: 'Synthetic operational dataset',
    complexity: 'High',
    value: ['Operational optimisation', 'Management intelligence', 'Proactive exception detection', 'Enterprise productivity'],
    cta: 'Explore the analysis',
  },
];

export const levelBySlug = (slug: string) => LEVELS.find((l) => l.slug === slug);

export const DATA_BADGE: Record<DataKind, { label: string; tone: 'real' | 'synthetic' | 'mixed' }> = {
  real:      { label: 'Real catalogue data',  tone: 'real' },
  synthetic: { label: 'Synthetic data',       tone: 'synthetic' },
  mixed:     { label: 'Real + synthetic',     tone: 'mixed' },
};
