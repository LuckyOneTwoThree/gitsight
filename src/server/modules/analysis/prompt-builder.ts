import type { GitHubRepoContext } from "@/src/server/modules/project/github-context"
import type { EvidencePack } from "./evidence-extractor"
import type { AnalysisSectionType } from "./types"

export const PROMPT_VERSION = "v8-2026-05-28"

export type ReportLanguage = "zh" | "en"

export function buildAnalysisPrompt(
  sectionType: AnalysisSectionType,
  context: GitHubRepoContext,
  evidencePack?: EvidencePack,
  qualityFeedback?: string[],
  _reserved?: unknown,
  lang: ReportLanguage = "zh"
) {
  const config = sectionConfigs[sectionType]
  if (!config) throw new Error(`Unknown analysis section type: ${sectionType}`)

  return {
    system: buildSystemPrompt(sectionType, config, lang),
    user: buildUserPrompt(sectionType, config, context, evidencePack, qualityFeedback, lang),
    temperature: config.temperature,
  }
}

interface SectionConfig {
  role: string
  objective: string
  depthFramework: string[]
  mustAnswer: string[]
  qualityBar: string[]
  schema: Record<string, unknown>
  contextFocus: string[]
  temperature: number
}

const evidenceRefRule =
  "Every evidence_refs array must contain exact IDs from evidence_catalog, such as metadata:repo, readme:001, config:package-json, source:src-main-ts, release:001, issue:123. Do not write free-form citations like README:Features. If no valid evidence ID supports a claim, use an empty evidence_refs array, lower confidence, and mark the claim as an inference or unknown."

const commercialValueRule =
  "For every strategic or commercial recommendation, include the decision implication: who should act, what they should do next, why now, what evidence supports it, and what would change the recommendation."

const sectionConfigs: Record<AnalysisSectionType, SectionConfig> = {
  tldr: {
    role: "You are a senior product analyst. You produce dense, evidence-backed project briefings for founders, PMs, engineers, and investors.",
    objective: "Help a reader decide in two minutes whether this repository is worth deeper investigation.",
    depthFramework: [
      "Classify the project category and product surface.",
      "Separate user pain, product capability, and technical implementation.",
      "Identify who benefits most, in which concrete scenario, and why now.",
      "Expose adoption blockers, missing evidence, and overclaimed value.",
    ],
    mustAnswer: [
      "What is this project, in one precise category?",
      "What user pain does it solve?",
      "What are the 3-6 most evidence-backed capabilities?",
      "Who should care, and who should not?",
      "What should be verified before adoption?",
    ],
    qualityBar: [
      "No generic praise. Every capability must include a concrete mechanism or user outcome.",
      "Risks must include evidence gaps, not only technical risks.",
      "The summary must be short, but the rest of the report must contain enough detail to be actionable.",
    ],
    schema: {
      title: "Report title",
      summary: "2-4 sentence executive summary",
      category: "Specific product or technology category",
      problem: "User-centered pain point",
      core_capabilities: [
        {
          capability: "Capability name",
          user_value: "Why this matters to users",
          mechanism: "How the repository appears to support it",
          evidence_refs: ["readme:001"],
          confidence: "high | medium | low",
        },
      ],
      suitable_users: [
        {
          persona: "Specific persona",
          scenario: "Concrete scenario",
          expected_value: "Expected value",
          evidence_refs: ["metadata:repo"],
        },
      ],
      not_ideal_for: ["User or scenario where the project may not fit"],
      adoption_questions: [
        {
          question: "Question to verify before adoption",
          why_it_matters: "Impact if unanswered",
          evidence_refs: ["warning:001"],
        },
      ],
      risks_or_unknowns: [
        {
          item: "Risk or unknown",
          severity: "high | medium | low",
          reason: "Evidence-backed reason",
          evidence_refs: ["readme:001"],
        },
      ],
      confidence: {
        level: "high | medium | low",
        reason: "Reliability explanation",
      },
    },
    contextFocus: ["README", "description", "topics", "homepage", "license"],
    temperature: 0.12,
  },

  reverse_prd: {
    role: "You are a principal product strategist, senior PM, and commercial due-diligence analyst. You turn repository evidence into a benchmark-grade Reverse PRD that can be read by founders, PMs, engineering leads, investors, and competitive intelligence teams.",
    objective: "Produce GitSight's flagship Reverse PRD: a product opportunity analysis, reverse-engineered PRD, commercial diligence memo, and role-specific action plan grounded in repository evidence.",
    depthFramework: [
      "Start at the strategy layer: why this product could exist now, what opportunity type it represents, and what ceiling or constraint is visible from the evidence.",
      "Translate the repository into a product system: positioning, target users, JTBD, user journeys, feature hierarchy, MVP loop, and product experience.",
      "Analyze commercial potential: business model, growth path, replacement behavior, differentiation, defensibility, and monetization triggers.",
      "Create a structured opportunity scorecard with evidence strength and confidence, not just qualitative prose.",
      "Convert findings into action: validation plan, metrics framework, risks, open questions, and role-specific recommendations.",
      "Separate confirmed facts, inferred judgments, and unverifiable hypotheses throughout the report.",
    ],
    mustAnswer: [
      "What is the product opportunity, and why might it be strategically meaningful now?",
      "Who is the product truly for, what job does it solve, and who is not a good fit?",
      "What is the likely user journey and minimum viable product loop?",
      "Which features are P0/P1/P2, what dependencies exist, and what is still missing?",
      "What business model, growth path, differentiation, and defensibility are supported or only inferred?",
      "What assumptions and metrics should be validated before serious investment?",
      "What should founders, PMs, engineering leads, investors, and maintainers do next?",
    ],
    qualityBar: [
      "This report must feel materially deeper than a normal summary. Avoid shallow sections that only restate README claims.",
      "Every strategic claim must include evidence_refs, confidence, and whether it is confirmed, inferred, or a hypothesis when the schema provides those fields.",
      "Do not invent specific competitors. Analyze replacement categories unless concrete alternatives are present in evidence.",
      "Scoring must include rationale and evidence limits; never present weak evidence as certainty.",
      "Action recommendations must be specific enough that a founder, PM, engineering lead, investor, or maintainer could act on them.",
    ],
    schema: {
      title: "Report title",
      cover_summary: {
        project_name: "Project name",
        one_sentence_positioning: "One-sentence positioning",
        category: "Product category",
        core_value_proposition: "Core value proposition",
        primary_users: ["Primary user"],
        product_stage: "prototype | MVP | early product | mature product | unclear",
        opportunity_score: "0-100",
        highest_value_insight: "Most valuable insight",
        biggest_uncertainty: "Biggest uncertainty",
        evidence_refs: ["metadata:repo", "readme:001"],
        confidence: "high | medium | low",
      },
      strategic_judgment: {
        opportunity_type: "incumbent replacement | efficiency gain | AI-native workflow | developer tool | platform | infrastructure | other",
        why_now: "Why this opportunity may exist now",
        demand_rigidity: "How hard or urgent the demand appears",
        long_term_ceiling: "Potential ceiling and why",
        strategic_focus: "Current strategic center of gravity inferred from evidence",
        product_archetype: "tool | platform | ecosystem entry point | infrastructure | unclear",
        critical_strategy_assumption: "Most important assumption",
        evidence_strength: "strong | medium | weak",
        evidence_refs: ["readme:001", "tree:sample"],
        confidence: "high | medium | low",
      },
      positioning: {
        statement: "For [target user] who [need], this project is a [category] that [benefit]. Compared with [replacement category], it emphasizes [differentiator].",
        target_market: "Target market or segment",
        replacement_categories: ["Current replacement category"],
        differentiators: ["Differentiator"],
        primary_use_cases: ["Use case"],
        not_suitable_for: ["Scenario where the product is not a good fit"],
        positioning_risks: ["Positioning risk"],
        evidence_refs: ["metadata:repo", "readme:001"],
        confidence: "high | medium | low",
      },
      target_users_and_jtbd: [
        {
          persona: "Specific target user",
          role_in_buying_process: "decision maker | user | influencer | maintainer | unknown",
          context: "Business or technical context",
          job_to_be_done: "When [situation], I want to [motivation], so I can [expected outcome].",
          pain_intensity: "high | medium | low",
          adoption_motivation: "Why they would adopt it",
          payment_motivation: "Why they might pay or invest effort",
          maturity_required: "beginner | intermediate | advanced | unclear",
          not_a_fit_when: "When this persona is not a good fit",
          evidence_refs: ["readme:001"],
          confidence: "high | medium | low",
        },
      ],
      core_user_journeys: [
        {
          journey: "Journey name",
          trigger: "Triggering scenario",
          user_goal: "User goal",
          steps: [
            {
              step: 1,
              user_action: "User action",
              product_capability: "Capability that supports this step",
              success_criteria: "What success looks like",
              blocking_points: ["Potential blocker"],
            },
          ],
          perceived_value: "Value perceived by user after completing the journey",
          evidence_refs: ["readme:001"],
          confidence: "high | medium | low",
        },
      ],
      feature_system: {
        module_tree: [
          {
            module: "Module name",
            responsibility: "What product responsibility this module carries",
            child_capabilities: ["Capability"],
            evidence_refs: ["tree:sample"],
          },
        ],
        prioritized_features: [
          {
            feature: "Feature name",
            priority: "P0 | P1 | P2",
            user_problem: "User problem it solves",
            dependency: "Feature dependency or none",
            mvp_required: true,
            maturity: "concept | partial | usable | mature | unclear",
            priority_rationale: "Why this priority is justified",
            evidence_strength: "strong | medium | weak",
            evidence_refs: ["readme:001", "tree:sample"],
            confidence: "high | medium | low",
          },
        ],
        missing_capabilities: [
          {
            capability: "Missing or weak capability",
            why_it_matters: "Why it matters",
            evidence_refs: ["warning:001"],
          },
        ],
      },
      mvp_reverse_engineering: {
        minimum_viable_loop: "Smallest coherent user value loop",
        must_have_capabilities: ["MVP capability"],
        deferrable_capabilities: ["Capability that can wait"],
        current_stage_vs_mvp: "Behind MVP | MVP-like | beyond MVP | unclear",
        mvp_completeness_score: "0-100",
        validation_metrics: ["Metric to validate MVP"],
        missing_evidence: ["Missing evidence"],
        evidence_refs: ["readme:001", "tree:sample"],
        confidence: "high | medium | low",
      },
      product_experience_and_information_architecture: {
        main_surfaces: ["UI page, command, API, module, or workflow surface"],
        information_architecture: "How the product is organized for users",
        onboarding_path: ["Likely onboarding step"],
        configuration_complexity: "low | medium | high | unclear",
        integration_complexity: "low | medium | high | unclear",
        learning_curve: "low | medium | high | unclear",
        experience_strengths: ["Experience strength"],
        experience_risks: ["Experience risk"],
        evidence_refs: ["readme:001", "tree:sample"],
        confidence: "high | medium | low",
      },
      business_model_and_growth_path: {
        confirmed_commercial_signals: ["Confirmed commercialization signal"],
        likely_business_model: "Evidence-based business model inference or insufficient evidence",
        payment_triggers: ["Trigger that could make users pay"],
        open_source_cloud_enterprise_path: "Possible OSS/cloud/enterprise path",
        growth_channels: ["Likely growth or distribution channel"],
        distribution_advantages: ["Distribution advantage"],
        ecosystem_or_network_effects: ["Ecosystem or network effect"],
        commercialization_friction: ["Commercialization blocker"],
        unknowns: ["Unconfirmed commercial question"],
        evidence_refs: ["metadata:repo", "readme:001"],
        confidence: "high | medium | low",
      },
      competition_and_replacement_analysis: {
        replacement_categories: ["What users may use today instead"],
        advantages_vs_replacements: ["Advantage"],
        disadvantages_or_switching_costs: ["Disadvantage or switching cost"],
        differentiation_moats: ["Potential moat or defensibility signal"],
        easy_to_copy_parts: ["Part that competitors could copy"],
        competitive_risks: ["Competitive risk"],
        next_competitor_signals_to_check: ["Signal to verify later"],
        evidence_refs: ["readme:001", "metadata:repo"],
        confidence: "high | medium | low",
      },
      product_opportunity_scorecard: {
        overall_score: "0-100",
        dimensions: [
          {
            dimension: "pain intensity | solution clarity | MVP completeness | differentiation | technical feasibility | monetization potential | growth potential | risk controllability | evidence credibility",
            score: "0-100",
            rationale: "Why this score",
            evidence_refs: ["readme:001"],
            confidence: "high | medium | low",
          },
        ],
        score_rationale: "Overall opportunity score rationale",
        evidence_limits: ["Why this score may be wrong"],
      },
      assumptions_and_validation_plan: [
        {
          assumption_type: "user | demand | technical | distribution | commercial",
          assumption: "Assumption",
          why_it_matters: "Why this assumption matters",
          validation_method: "How to test it",
          validation_metric: "Metric to watch",
          failure_signal: "Signal that disproves it",
          priority: "high | medium | low",
          evidence_refs: ["readme:001"],
        },
      ],
      metrics_framework: {
        north_star_metric: "North star metric",
        activation_metrics: ["Activation metric"],
        retention_metrics: ["Retention metric"],
        conversion_metrics: ["Conversion metric"],
        usage_depth_metrics: ["Usage depth metric"],
        quality_metrics: ["Quality metric"],
        community_or_ecosystem_metrics: ["Community/ecosystem metric"],
        observable_repo_signals: ["Currently observable signal"],
        missing_data: ["Data needed but not available"],
      },
      risks_limits_and_open_questions: [
        {
          risk_type: "product | technical | market | commercial | operational | community | evidence_limit",
          item: "Risk, limit, or open question",
          impact: "Impact if true",
          next_research_step: "What to investigate next",
          evidence_refs: ["warning:001"],
        },
      ],
      role_based_action_plan: {
        founder: ["Specific next action for founder"],
        product_manager: ["Specific next action for PM"],
        engineering_lead: ["Specific next action for engineering lead"],
        investor_or_competitive_researcher: ["Specific next action for investor or CI analyst"],
        open_source_maintainer: ["Specific next action for maintainer"],
      },
      final_judgment: {
        worth_continued_investigation: "yes | no | unclear",
        strongest_opportunity: "Strongest opportunity",
        biggest_uncertainty: "Biggest uncertainty",
        highest_priority_validation: "Most important validation step",
        recommended_next_step: "Recommended next step",
        report_confidence: "high | medium | low",
        evidence_refs: ["metadata:repo", "readme:001"],
      },
    },
    contextFocus: ["README", "license", "homepage", "topics", "description", "tree"],
    temperature: 0.14,
  },

  architecture: {
    role: "You are a principal software architect. You analyze repository structure, boundaries, runtime model, and engineering risks from evidence.",
    objective: "Produce an architecture report that helps engineers understand system shape, module responsibilities, data flow, and technical risk.",
    depthFramework: [
      "Identify language, framework, runtime, build system, deployment shape, and test strategy.",
      "Map top-level directories and important source files into architectural layers.",
      "Infer data/request flow only from visible entry points, routes, scripts, docs, or source files.",
      "Highlight module boundaries, coupling signals, missing tests, missing deployment/schema evidence, and scalability concerns.",
      "Generate a compact Mermaid diagram that reflects evidence, not imagination.",
    ],
    mustAnswer: [
      "What architecture pattern best describes this repository?",
      "What are the major modules and boundaries?",
      "How does the main request/user flow likely move through the system?",
      "What technologies are confirmed, and which are unknown?",
      "What architectural risks should a maintainer verify first?",
    ],
    qualityBar: [
      "Modules must include path, responsibility, key files, evidence, and confidence.",
      "Data flow must be stepwise and mark inferred steps.",
      "Do not claim databases, queues, services, or APIs unless evidence supports them.",
      "Mermaid must start with flowchart TD and contain no more than 12 nodes.",
    ],
    schema: {
      title: "Report title",
      architecture_summary: "3-5 sentence architecture summary",
      pattern: {
        name: "Architecture pattern",
        rationale: "Why this pattern fits",
        confidence: "high | medium | low",
        evidence_refs: ["tree:sample"],
      },
      tech_stack: [
        {
          name: "Technology",
          category: "language | framework | database | build | test | deployment | ci | other",
          version: "Version or unknown",
          usage: "How it is used in this repository",
          evidence_refs: ["config:package-json"],
        },
      ],
      modules: [
        {
          name: "Module name",
          path: "Directory or file path",
          layer: "ui | api | domain | data | infra | tooling | docs | unknown",
          responsibility: "Responsibility",
          key_files: ["File path"],
          evidence_refs: ["tree:sample", "source:src-main-ts"],
          confidence: "high | medium | low",
        },
      ],
      data_flow: [
        {
          step: 1,
          component: "Component",
          action: "What happens",
          input_output: "Input/output if known",
          inferred: true,
          evidence_refs: ["source:src-main-ts"],
        },
      ],
      mermaid: "flowchart TD diagram",
      architecture_risks: [
        {
          risk: "Risk",
          category: "scalability | maintainability | security | operability | testability | unknown",
          impact: "Impact",
          mitigation_or_next_check: "What to verify next",
          evidence_refs: ["config:package-json"],
        },
      ],
      unknowns: ["Important architecture question not answerable from current evidence"],
    },
    contextFocus: ["tree", "configFiles", "README", "language"],
    temperature: 0.12,
  },

  code_wiki: {
    role: "You are a senior developer advocate and technical writer. You create practical developer onboarding guides from repository evidence.",
    objective: "Produce a CodeWiki-style guide that helps a new developer run, read, and modify the project with minimal wandering.",
    depthFramework: [
      "Extract install, quickstart, development, test, lint, Docker, and environment requirements.",
      "Identify entry points and explain why they matter.",
      "Build a reading path from runnable surface to core modules to extension points.",
      "List likely pitfalls only when evidence supports them or when evidence is missing.",
      "Separate confirmed commands from recommended next checks.",
    ],
    mustAnswer: [
      "How should a developer set up and run the project?",
      "What files should they read first, and in what order?",
      "Where are the likely extension points?",
      "How do they test or validate changes?",
      "What is missing from onboarding evidence?",
    ],
    qualityBar: [
      "Commands must come from README, config files, Makefile, Docker, or scripts.",
      "If a command is not found, say it is not found; do not invent it.",
      "Critical path must include file paths and reading purpose.",
      "FAQ must answer developer workflow questions, not generic product questions.",
    ],
    schema: {
      title: "Report title",
      quickstart: {
        prerequisites: ["Confirmed requirement or not found in evidence"],
        setup_steps: ["Step with command if confirmed"],
        first_run: "First run command or not found in evidence",
        evidence_refs: ["readme:001", "config:package-json"],
      },
      developer_map: {
        package_manager: "npm | pnpm | yarn | pip | go | cargo | maven | unknown",
        build_command: "Command or not found in evidence",
        test_command: "Command or not found in evidence",
        lint_command: "Command or not found in evidence",
        env_requirements: ["Environment variable or external dependency"],
      },
      entry_points: [
        {
          path: "File or directory",
          role: "Role in the project",
          why_start_here: "Why new developers should inspect it",
          read_next: ["Path"],
          evidence_refs: ["source:src-main-ts"],
        },
      ],
      critical_path: [
        {
          order: 1,
          path: "Path",
          focus: "What to inspect",
          expected_learning: "What the developer learns",
          evidence_refs: ["tree:sample"],
        },
      ],
      extension_points: [
        {
          area: "Area",
          suggested_files: ["Path"],
          change_type: "Feature | bugfix | integration | docs | tests",
          difficulty: "beginner | intermediate | advanced",
          evidence_refs: ["tree:sample"],
        },
      ],
      common_gotchas: [
        {
          problem: "Potential pitfall",
          solution_or_next_check: "How to avoid or verify",
          confidence: "high | medium | low",
          evidence_refs: ["warning:001"],
        },
      ],
      faq: [
        {
          question: "Developer question",
          answer: "Actionable answer",
          evidence_refs: ["readme:001"],
        },
      ],
    },
    contextFocus: ["README", "tree", "configFiles"],
    temperature: 0.12,
  },

  timeline: {
    role: "You are a product strategy analyst. You reconstruct product evolution from releases, README, roadmap language, module structure, and current repository signals.",
    objective: "Produce an evolution report that separates stated history from inferred evolution and explains strategic meaning.",
    depthFramework: [
      "Prefer releases, changelog, roadmap, migration notes, and version signals.",
      "Infer MVP scope from foundational features and simplest coherent product surface.",
      "Identify phase changes from feature expansion, new modules, integrations, deployment options, or issue/release signals.",
      "Separate stated milestones from inferred milestones.",
      "Describe future trajectory only when supported by roadmap or structural signals.",
    ],
    mustAnswer: [
      "What was the likely MVP scope?",
      "Which milestones are stated vs inferred?",
      "What product evolution pattern is visible?",
      "Were there strategic pivots?",
      "What future direction is evidence-backed, and what is unknown?",
    ],
    qualityBar: [
      "Never invent dates. If dates are unavailable, write that time is not confirmed.",
      "Every milestone must include evidence and confidence.",
      "Strategic pivots must explain from/to, trigger, and evidence strength.",
      "Do not claim full commit history analysis unless evidence provides it.",
    ],
    schema: {
      title: "Report title",
      timeline_type: "stated | inferred | mixed",
      mvp_scope: {
        description: "Likely MVP scope",
        period: "Confirmed period or time not confirmed in evidence",
        core_features: ["MVP feature"],
        evidence_refs: ["readme:001"],
        confidence: "high | medium | low",
      },
      milestones: [
        {
          phase: "Phase name",
          period: "Confirmed period or time not confirmed",
          stated_or_inferred: "stated | inferred",
          key_changes: ["Change"],
          strategic_meaning: "Why this mattered",
          evidence_refs: ["release:001", "readme:001"],
          confidence: "high | medium | low",
        },
      ],
      evolution_pattern: {
        name: "Pattern name",
        explanation: "Why this pattern fits",
        evidence_refs: ["readme:001", "tree:sample"],
      },
      strategic_pivots: [
        {
          from: "Previous direction",
          to: "New direction",
          trigger: "Likely trigger or unknown",
          evidence_refs: ["release:001"],
          confidence: "high | medium | low",
        },
      ],
      future_outlook: {
        stated_plans: ["Explicit plan"],
        inferred_trajectory: "Evidence-based trajectory",
        risks: ["Future risk"],
        unknowns: ["Unknown"],
      },
      evidence_limits: ["Limit caused by missing releases, commits, or roadmap evidence"],
    },
    contextFocus: ["README", "homepage", "description", "topics", "configFiles", "tree"],
    temperature: 0.18,
  },

  tech_stack: {
    role: "You are a technology stack analyst and DevOps consultant. You evaluate technology choices by fit, maturity, maintainability, and operational risk.",
    objective: "Produce a technology stack report that explains what is used, why it likely fits, what risks exist, and what to verify next.",
    depthFramework: [
      "Parse config files for languages, frameworks, dependencies, scripts, test tooling, linting, formatting, CI, Docker, and deployment signals.",
      "Group technologies by purpose, not by file.",
      "Assess maturity from scripts, tests, CI, containerization, dependency update tooling, and lockfiles.",
      "Discuss alternatives only at category level and only as likely trade-offs.",
      "Flag supply-chain risks using evidence: unpinned deps, missing lockfile, large dependency surface, absent update automation, or unknowns.",
    ],
    mustAnswer: [
      "What stack is confirmed?",
      "What purpose does each major technology serve?",
      "How mature is the engineering toolchain?",
      "What trade-offs does the stack imply?",
      "What dependency or operational risks should be checked?",
    ],
    qualityBar: [
      "Versions must come from config evidence or be marked unknown.",
      "Do not claim dependency freshness unless evidence supports it.",
      "Assessment must include strengths and weaknesses.",
      "Supply-chain risks must be specific and evidence-backed.",
    ],
    schema: {
      title: "Report title",
      stack_overview: "3-5 sentence overview",
      categories: [
        {
          name: "Category",
          technologies: [
            {
              name: "Technology",
              version: "Version or unknown",
              purpose: "Purpose in this project",
              evidence_refs: ["config:package-json"],
              confidence: "high | medium | low",
            },
          ],
        },
      ],
      engineering_maturity: {
        score: "0-100",
        strengths: ["Strength"],
        gaps: ["Gap"],
        rationale: "Scoring rationale",
        evidence_refs: ["config:package-json", "ci:github-workflows-ci-yml"],
      },
      assessment: {
        overall: "Overall stack fitness assessment",
        strengths: ["Strength"],
        weaknesses: ["Weakness"],
        recommended_checks: ["Next verification step"],
        evidence_refs: ["metadata:repo", "config:package-json"],
      },
      tradeoffs: [
        {
          choice: "Technology or pattern",
          benefit: "Benefit",
          cost_or_risk: "Cost or risk",
          alternative: "Common alternative",
          evidence_refs: ["config:package-json"],
        },
      ],
      dependency_risks: [
        {
          risk: "Risk",
          severity: "high | medium | low",
          mitigation: "Recommended mitigation or next check",
          evidence_refs: ["config:package-json"],
        },
      ],
      unknowns: ["Stack area not confirmed by current evidence"],
    },
    contextFocus: ["configFiles", "tree", "language", "README"],
    temperature: 0.12,
  },

  community: {
    role: "You are an open-source community health analyst. You evaluate adoption, governance, contributor friendliness, and maintenance sustainability.",
    objective: "Produce a community health report that is honest about what GitHub metadata can and cannot prove.",
    depthFramework: [
      "Use stars, forks, watchers, issues, PR summaries, contributors, topics, license, and documentation signals.",
      "Separate popularity from community health.",
      "Assess maintenance pressure using open issues and recent issue/PR summaries, but avoid claiming response speed without enough evidence.",
      "Assess contributor friendliness from docs, setup, tests, contribution guide, code of conduct, and communication channels.",
      "Make recommendations that maintainers could actually execute.",
    ],
    mustAnswer: [
      "How strong is adoption signal?",
      "What maintenance pressure is visible?",
      "How contributor-friendly is the project?",
      "What governance and license signals exist?",
      "What data is missing for a confident community assessment?",
    ],
    qualityBar: [
      "Do not equate stars with quality.",
      "Do not claim response time unless issue/PR timestamps support it, and even then mark inference.",
      "Scores must include rationale and evidence.",
      "Recommendations must be prioritized and actionable.",
    ],
    schema: {
      title: "Report title",
      health_score: {
        overall: "0-100",
        rationale: "Overall score rationale",
        dimensions: [
          {
            name: "Dimension",
            score: "0-100 or unknown",
            justification: "Evidence-backed justification",
            evidence_refs: ["metadata:repo"],
          },
        ],
      },
      adoption_signals: [
        {
          signal: "Signal",
          interpretation: "What it means and what it does not prove",
          evidence_refs: ["metadata:repo"],
        },
      ],
      maintenance_pressure: {
        assessment: "Assessment",
        visible_signals: ["Signal"],
        unknowns: ["Unknown"],
        evidence_refs: ["metadata:repo", "issue:123"],
      },
      contributor_friendliness: {
        onboarding_experience: "Assessment",
        has_contributing_guide: "true | false | unclear",
        has_code_of_conduct: "true | false | unclear",
        setup_clarity: "high | medium | low | unknown",
        evidence_refs: ["readme:001", "config:contributing-md"],
      },
      license_analysis: {
        type: "License or unknown",
        implications: "Implications for users and contributors",
        commercial_use: "Commercial use judgment or unknown",
        evidence_refs: ["metadata:repo"],
      },
      strengths: [{ item: "Strength", evidence_refs: ["metadata:repo"] }],
      concerns: [{ item: "Concern", impact: "Impact", evidence_refs: ["issue:123"] }],
      recommendations: [
        {
          priority: "high | medium | low",
          recommendation: "Actionable recommendation",
          rationale: "Why it helps",
        },
      ],
      analysis_limits: ["Metric not covered by current data"],
    },
    contextFocus: ["README", "license", "stars", "forks", "open_issues_count", "topics", "configFiles"],
    temperature: 0.12,
  },

  contribution_guide: {
    role: "You are an experienced open-source maintainer and contributor onboarding specialist.",
    objective: "Produce a contribution guide that helps a developer move from interest to first useful pull request.",
    depthFramework: [
      "Find explicit contribution docs, code of conduct, license, setup instructions, and scripts.",
      "Identify contribution areas from module structure, docs, tests, issues, and complexity.",
      "Separate confirmed project workflow from recommended best practice.",
      "Assess beginner friendliness and likely first PR strategy.",
      "Expose missing maintainer expectations and process unknowns.",
    ],
    mustAnswer: [
      "How should a contributor set up the project?",
      "Where can they contribute first?",
      "What standards and tests should they follow?",
      "What is the PR process, confirmed or recommended?",
      "What communication channels or governance signals exist?",
    ],
    qualityBar: [
      "Setup, build, test, and lint commands must be evidence-backed or marked not found.",
      "Contribution areas must include concrete paths and difficulty.",
      "PR process must separate confirmed workflow from recommended workflow.",
      "Do not invent Discord, Slack, review time, or maintainer preferences.",
    ],
    schema: {
      title: "Report title",
      getting_started: {
        setup_steps: ["Step"],
        environment_requirements: ["Requirement or not found in evidence"],
        build_command: "Command or not found",
        test_command: "Command or not found",
        evidence_refs: ["readme:001", "config:package-json"],
      },
      contribution_areas: [
        {
          area: "Area",
          difficulty: "beginner | intermediate | advanced",
          contribution_type: "docs | tests | bugfix | feature | integration | tooling",
          description: "What to contribute",
          suggested_files: ["Path"],
          why_this_area: "Why this is suitable",
          evidence_refs: ["tree:sample", "issue:123"],
          confidence: "high | medium | low",
        },
      ],
      coding_standards: {
        style_guide: "Style requirements or unknown",
        commit_convention: "Commit convention or unknown",
        testing_requirements: "Testing expectations or unknown",
        evidence_refs: ["config:eslint-config-js"],
      },
      pr_process: {
        confirmed_workflow: ["Confirmed step"],
        recommended_workflow: ["Recommended step, clearly marked"],
        review_criteria: "Known or unknown",
        typical_review_time: "Known or unknown",
      },
      communication: {
        channels: [
          {
            name: "Channel",
            purpose: "Purpose",
            link_or_reference: "Evidence reference",
          },
        ],
        maintainer_response_pattern: "Known or unknown",
      },
      first_pr_strategy: {
        recommended_start: "Recommended first contribution",
        rationale: "Why this is likely to work",
        evidence_refs: ["tree:sample"],
      },
      missing_contributor_information: ["Missing information"],
    },
    contextFocus: ["README", "tree", "configFiles", "license"],
    temperature: 0.12,
  },

  supply_chain: {
    role: "You are a software supply chain security analyst. You evaluate dependency risks, license compliance, maintainer sustainability, and vulnerability exposure from repository evidence.",
    objective: "Produce a supply chain security report that identifies dependency risks, license issues, maintainer bus factors, and actionable security recommendations.",
    depthFramework: [
      "Parse config files for direct and indirect dependency signals (package.json, requirements.txt, go.mod, Cargo.toml, etc.).",
      "Assess license compatibility based on the project license and common open-source license interactions.",
      "Evaluate maintainer risk from contributor count, issue response patterns, and commit/release frequency.",
      "Identify dependency chain risks: unpinned versions, missing lockfiles, large dependency surface, abandoned dependencies.",
      "Provide concrete action items for risk mitigation, clearly separating confirmed risks from inferred risks.",
    ],
    mustAnswer: [
      "What dependencies does the project have, and how many are direct vs inferred?",
      "Are there license compliance risks?",
      "What is the maintainer bus factor?",
      "What dependency chain risks are visible?",
      "What security actions should be taken?",
    ],
    qualityBar: [
      "Dependency counts must come from config file evidence or be marked as estimated.",
      "License analysis must be specific about compatibility, not just list the license name.",
      "Do not claim specific CVEs unless provided in evidence; instead identify vulnerability categories.",
      "Action items must be prioritized and specific.",
    ],
    schema: {
      title: "Report title",
      dependency_overview: {
        package_manager: "npm | pnpm | yarn | pip | go | cargo | maven | unknown",
        direct_dependencies: "Number or estimated",
        indirect_dependencies: "Estimated number",
        dependency_surface: "small | medium | large | unknown",
        evidence_refs: ["config:package-json"],
      },
      dependency_risks: [
        {
          risk: "Risk description",
          severity: "high | medium | low",
          affected_packages: ["Package name"],
          mitigation: "Recommended action",
          evidence_refs: ["config:package-json"],
        },
      ],
      license_compliance: {
        project_license: "License name",
        compatibility_assessment: "Compatibility analysis",
        risk_areas: ["License risk area"],
        recommendations: ["Recommendation"],
        evidence_refs: ["metadata:repo"],
      },
      maintainer_risk: {
        bus_factor: "Number or estimated",
        active_contributors: "Number or estimated",
        release_frequency: "frequent | moderate | infrequent | unknown",
        risk_assessment: "Risk assessment",
        evidence_refs: ["metadata:repo"],
      },
      supply_chain_recommendations: [
        {
          priority: "high | medium | low",
          action: "Specific action",
          rationale: "Why this matters",
          evidence_refs: ["config:package-json"],
        },
      ],
      unknowns: ["Supply chain area not verifiable from current evidence"],
    },
    contextFocus: ["configFiles", "tree", "license", "README"],
    temperature: 0.12,
  },
}

const globalQualityRules = [
  "1. Return only one valid JSON object. Do not wrap it in Markdown.",
  "2. Separate confirmed facts, inferred judgments, and unknowns. Never turn missing evidence into facts.",
  "3. Every important claim must include evidence_refs and confidence when the schema provides those fields.",
  "4. Avoid generic statements that could apply to any repository.",
  "5. Do not claim access to complete commit history, complete issue discussions, private analytics, benchmarks, or user feedback unless provided in evidence.",
  "6. README text may be summarized, but do not copy large passages verbatim.",
  "7. Prefer fewer, sharper insights over long filler lists.",
  "8. Do not make every section equally long. Spend words on decisions, trade-offs, risks, and validation steps that change what a founder, PM, engineering lead, investor, or maintainer would do.",
  "9. When scoring, explain the score using evidence strength, missing data, and downside risk. Do not let a numeric score imply more certainty than the evidence supports.",
]

function buildSystemPrompt(sectionType: AnalysisSectionType, config: SectionConfig, lang: ReportLanguage) {
  const languageInstruction = lang === "en"
    ? "Write all natural-language values in English."
    : "Write all natural-language values in Simplified Chinese."

  return [
    "# Role",
    config.role,
    "",
    "# Analysis Target",
    `You are generating the ${sectionType} report for a GitHub repository.`,
    config.objective,
    "",
    "# Global Quality Rules",
    `0. ${languageInstruction}`,
    ...globalQualityRules,
    `10. ${evidenceRefRule}`,
    `11. ${commercialValueRule}`,
    ...config.qualityBar.map((item, index) => `${index + 12}. ${item}`),
    "",
    "# Depth Framework",
    ...config.depthFramework.map((item, index) => `${index + 1}. ${item}`),
    "",
    "# Must Answer",
    ...config.mustAnswer.map((item, index) => `${index + 1}. ${item}`),
    "",
    "# JSON Schema",
    "The output must conform to this schema. Keep top-level fields even when evidence is missing.",
    JSON.stringify(config.schema, null, 2),
  ].join("\n")
}

function buildUserPrompt(
  sectionType: AnalysisSectionType,
  config: SectionConfig,
  context: GitHubRepoContext,
  evidencePack?: EvidencePack,
  qualityFeedback?: string[],
  lang: ReportLanguage = "zh"
) {
  const noEvidence = lang === "en" ? "insufficient evidence, unable to confirm" : "证据不足，无法确认"

  return [
    `# Report Task: ${sectionType}`,
    "",
    "Generate the final report using the structured evidence pack and the raw repository context below.",
    "The structured evidence pack is the primary source of truth for citations. Raw context is only for cross-checking and nuance.",
    "",
    ...(evidencePack ? buildEvidencePackSection(evidencePack) : []),
    ...(qualityFeedback && qualityFeedback.length > 0 ? buildQualityFeedbackSection(qualityFeedback) : []),
    ...buildContextSections(config, context),
    "",
    "# Final Instructions",
    `If a field lacks evidence, keep the field and write "${noEvidence}".`,
    "Do not use evidence_refs that are absent from evidence_catalog.",
    "Do not pad the report with generic best practices. Each section must either support a decision, expose a trade-off, identify a risk, or define a concrete validation step.",
    "Make the report deep enough to be useful to a paying user, but honest about uncertainty.",
  ].join("\n")
}

function buildEvidencePackSection(evidencePack: EvidencePack) {
  return [
    "## Structured Evidence Pack",
    "Use this as the main citation source. evidence_refs in the final report must refer to evidence_catalog IDs.",
    "```json",
    JSON.stringify(evidencePack),
    "```",
    "",
  ]
}

function buildQualityFeedbackSection(feedback: string[]) {
  return [
    "## Previous Draft Quality Feedback",
    "The previous draft did not pass quality review. Fix every issue below and regenerate the complete JSON object:",
    ...feedback.map((item, index) => `${index + 1}. ${item}`),
    "",
  ]
}

function buildContextSections(config: SectionConfig, context: GitHubRepoContext): string[] {
  const parts: string[] = []
  const focus = new Set(config.contextFocus)

  parts.push("## Evidence Coverage")
  parts.push(JSON.stringify(
    {
      available_sources: {
        metadata: true,
        readme: Boolean(context.readme),
        tree_entries: context.tree.length,
        config_files: context.configFiles.map((file) => file.path),
        source_files: context.sourceFiles.map((file) => file.path),
        ci_files: context.ciFiles.map((file) => file.path),
        releases: context.releases.length,
        issues: context.issues.length,
        pull_requests: context.pullRequests.length,
        contributors: context.contributors.length,
        warnings: context.warnings,
      },
      limits: [
        "No complete commit history is provided.",
        "Only sampled issue, PR, release, contributor, tree, and source evidence is available.",
        "Maintainer response speed and real user feedback are not fully available unless explicitly present in evidence.",
      ],
    }
  ))

  parts.push("")
  parts.push("## Repository Metadata")
  parts.push(JSON.stringify({
    full_name: context.repo.full_name,
    description: context.repo.description,
    language: context.repo.language,
    stars: context.repo.stars,
    forks: context.repo.forks,
    open_issues_count: context.repo.open_issues_count,
    watchers: context.repo.watchers,
    license: context.repo.license,
    topics: context.repo.topics,
    homepage: context.repo.homepage,
    default_branch: context.repo.default_branch,
    is_archived: context.repo.is_archived,
    is_fork: context.repo.is_fork,
  }))

  if (context.warnings.length > 0) {
    parts.push("")
    parts.push("## Data Collection Warnings")
    parts.push(JSON.stringify(context.warnings))
  }

  appendJson(parts, "Recent Releases", context.releases)
  appendJson(parts, "Recent Issues", context.issues)
  appendJson(parts, "Recent Pull Requests", context.pullRequests)
  appendJson(parts, "Top Contributors", context.contributors)

  if (focus.has("tree") && context.tree.length > 0) {
    parts.push("")
    parts.push("## Directory Tree")
    parts.push("```text")
    parts.push(context.tree.join("\n"))
    parts.push("```")
  }

  if (focus.has("configFiles")) appendFiles(parts, "Configuration Files", context.configFiles, 6000)
  appendFiles(parts, "CI Files", context.ciFiles, 4000)
  appendFiles(parts, "Core Source Files", context.sourceFiles, 3500)

  if (focus.has("README") && context.readme) {
    parts.push("")
    parts.push("## README")
    parts.push("```text")
    parts.push(context.readme)
    parts.push("```")
  } else if (context.readme) {
    parts.push("")
    parts.push("## README Reference")
    parts.push("```text")
    parts.push(context.readme.slice(0, 6000))
    parts.push("```")
  }

  if (!focus.has("configFiles")) appendFiles(parts, "Configuration Files Reference", context.configFiles, 2500)

  return parts
}

function appendJson(parts: string[], title: string, value: unknown[]) {
  if (value.length === 0) return
  parts.push("")
  parts.push(`## ${title}`)
  parts.push(JSON.stringify(value))
}

function appendFiles(parts: string[], title: string, files: Array<{ path: string; content: string }>, maxLength: number) {
  if (files.length === 0) return
  parts.push("")
  parts.push(`## ${title}`)
  for (const file of files) {
    parts.push("")
    parts.push(`### ${file.path}`)
    parts.push("```text")
    parts.push(file.content.slice(0, maxLength))
    parts.push("```")
  }
}
