import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Archive, Check, ChevronLeft, ChevronRight, Clock3, FileText, FolderOpen, Plus, Sparkles, Target, X } from 'lucide-react';
import { CardHeading, FolderGlyph, InlineBackLink, PageEyebrow, Panel, ProgressBar, StatusChip, TinyPill } from '../components/Shared';
import { useDashboard } from '../state/DashboardContext';
import type { Project, ProjectFile } from '../data/seed';

type ProjectFilter = 'All' | 'Active' | 'Done';
type ProjectTab = 'Overview' | 'Milestones' | 'Files' | 'Activity';

const milestones = [
  { day: '22', month: 'Oct', title: 'Brand refresh review', project: 'Brand Refresh', status: 'Review' },
  { day: '24', month: 'Oct', title: 'Spec handoff', project: 'Zenith v2 spec', status: 'On track' },
  { day: '31', month: 'Oct', title: 'Research synthesis', project: 'Research', status: 'On track' },
  { day: '07', month: 'Nov', title: 'First essay draft', project: 'Writing', status: 'Planned' },
];

const deliverables = [
  { name: 'Brand guidelines v2', status: 'In review', owner: 'Mia Chen', date: 'Nov 14', progress: 82 },
  { name: 'Social templates', status: 'In progress', owner: 'Lena Park', date: 'Nov 12', progress: 68 },
  { name: 'Presentation deck', status: 'In progress', owner: 'Mia Chen', date: 'Nov 13', progress: 54 },
  { name: 'Logo files', status: 'Ready', owner: 'Studio', date: 'Nov 08', progress: 100 },
];

function WeekBars({ planned }: { planned: boolean }) {
  const plannedValues = [42, 58, 73, 66, 83, 24, 21];
  const doneValues = [35, 47, 61, 72, 91, 18, 15];
  const values = planned ? plannedValues : doneValues;
  return <div className="project-week-chart" aria-label={`${planned ? 'Planned' : 'Done'} focus hours by day`}>
    {values.map((height, index) => <div className={`project-week-column ${index === 4 ? 'is-today' : ''}`} key={index}>
      <div className="project-week-track"><span style={{ height: `${height}%` }} /></div>
      <small>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</small>
    </div>)}
  </div>;
}

function NewProjectDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    onCreate(value);
  }
  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="modal-card" onSubmit={submit}>
      <div className="modal-head"><h2>Start a project</h2><button type="button" className="icon-circle" aria-label="Close dialog" onClick={onClose}><X size={14} /></button></div>
      <p>Give the work a name. You can add a plan and deliverables as you go.</p>
      <label className="form-label">Project name<input autoFocus className="form-control" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Studio launch" /></label>
      <div className="modal-actions"><button type="button" className="button-quiet" onClick={onClose}>Cancel</button><button className="button-light" type="submit">Create project <ArrowRight size={13} /></button></div>
    </form>
  </div>;
}

function ProjectRow({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return <tr className="project-list-row">
    <td><button className="project-name-button" onClick={onOpen}><FolderGlyph active={project.id === 'zenith'} /><span><strong>{project.name}</strong><small>{project.sublabel}</small></span></button></td>
    <td>{project.nextBlock}</td>
    <td><div className="project-hours-cell"><span className="project-hour-segments">{Array.from({ length: 14 }, (_, index) => <i key={index} className={index < Math.round(project.progress / 8) ? 'is-filled' : ''} />)}</span><span>{project.hours.toFixed(1)}h</span></div></td>
    <td><div className="project-progress-cell"><strong>{project.progress}%</strong><small>{project.files}</small></div></td>
    <td>{project.due}</td>
    <td><StatusChip status={project.status} /></td>
    <td><button className="icon-circle project-open-button" onClick={onOpen} aria-label={`Open ${project.name}`}><ArrowUpRight size={13} /></button></td>
  </tr>;
}

export function ProjectsPage() {
  const { projects, addProject, notify } = useDashboard();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ProjectFilter>('All');
  const [planned, setPlanned] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [week, setWeek] = useState(43);
  const activeProjects = projects.filter((project) => project.status !== 'Done').length;
  const onTrackProjects = projects.filter((project) => project.status === 'On track').length;
  const onTrackPercent = activeProjects ? Math.round((onTrackProjects / activeProjects) * 100) : 0;
  const visibleProjects = useMemo(() => projects.filter((project) => {
    if (filter === 'Done') return project.status === 'Done';
    if (filter === 'Active') return project.status !== 'Done';
    return true;
  }), [filter, projects]);

  function openProject(project: Project) {
    if (project.id === 'brand-refresh') navigate('/projects/brand-refresh');
    else if (project.id === 'zenith') navigate('/focus');
    else notify(`${project.name} · ${project.status} · ${project.progress}% complete`);
  }

  return <div className="projects-page">
    <div className="projects-overview-top">
      <div className="projects-overview-title">
        <div className="projects-title-copy"><div className="projects-week-nav"><button aria-label="Previous week" onClick={() => setWeek((value) => value - 1)}><ChevronLeft size={12} /></button><PageEyebrow>Week {week} · {activeProjects} active</PageEyebrow><button aria-label="Next week" onClick={() => setWeek((value) => value + 1)}><ChevronRight size={12} /></button></div><h1 className="display-title">Projects</h1></div>
        <div className="projects-title-actions"><button className="button-light new-project-button" onClick={() => setDialogOpen(true)}><Plus size={14} /> New project</button><button className="button-quiet" onClick={() => { setFilter(filter === 'Done' ? 'All' : 'Done'); notify(filter === 'Done' ? 'All projects shown' : 'Completed projects shown'); }}><Archive size={12} /> Archive</button></div>
      </div>
      <div className="projects-summary-metrics">
        <button className="projects-summary-metric" onClick={() => setFilter('Active')}><span>Focus hours</span><strong>24.5<small>h</small></strong><small className="metric-change">+12% vs last week</small></button>
        <button className="projects-summary-metric" onClick={() => setFilter('Active')}><span>On track</span><strong>{onTrackPercent}<small>%</small></strong><small>{onTrackProjects} of {activeProjects} projects</small></button>
        <button className="projects-summary-metric" onClick={() => notify('Two project milestones are due this week')}><span>Due this week</span><strong>2</strong><small>Brand refresh, Zenith v2</small></button>
        <button className="projects-summary-metric" onClick={() => notify('23 files shipped across four projects')}><span>Files shipped</span><strong>23</strong><small>Across 4 projects</small></button>
      </div>
      <Panel className="projects-week-panel">
        <div className="projects-week-head"><span>Planned vs done</span><div className="projects-week-legend"><button className={planned ? 'is-active' : ''} onClick={() => setPlanned(true)}><i /> Planned</button><button className={!planned ? 'is-active' : ''} onClick={() => setPlanned(false)}><i /> Done</button></div></div>
        <WeekBars planned={planned} />
      </Panel>
    </div>

    <div className="projects-feature-grid">
      <button className="featured-project-card" onClick={() => navigate('/focus')}>
        <div className="featured-project-meta"><TinyPill tone="amber"><i className="inline-dot" /> In focus</TinyPill><span>Due Fri, 24 Oct</span></div>
        <div className="featured-project-title">Zenith v2 spec</div>
        <div className="featured-project-subline">12 files <i /> 18.5h focused <i /> next block today 14:00</div>
        <div className="featured-project-bottom"><div className="featured-progress"><strong>68<small>%</small></strong><span>8 of 12 files done</span></div><div className="featured-next"><small>NEXT UP</small><div><Check size={12} /> Empty states <span>Done Tue</span></div><div><Target size={12} /> Invite flow <span>In session now</span></div><div><span className="empty-circle" /> Handoff to Lena <span>Fri</span></div></div><div className="folder-art-large"><span className="folder-paper folder-paper--one" /><span className="folder-paper folder-paper--two" /><span className="folder-paper folder-paper--amber" /><div className="folder-pocket"><FolderOpen size={50} strokeWidth={1.05} /><small>ZENITH V2 · 12 FILES</small></div></div></div>
      </button>
      <Panel className="project-milestone-panel">
        <CardHeading title="Milestones" detail="Next 14 days" action={<button className="icon-circle" aria-label="Open Brand Refresh" onClick={(event) => { event.stopPropagation(); navigate('/projects/brand-refresh'); }}><ArrowUpRight size={13} /></button>} />
        <div className="project-milestone-list">{milestones.map((item) => <button className="project-milestone-row" key={item.title} onClick={() => item.project === 'Brand Refresh' ? navigate('/projects/brand-refresh') : notify(`${item.title} · ${item.project}`)}><span className="milestone-date"><b>{item.day}</b><small>{item.month}</small></span><span className="milestone-copy"><strong>{item.title}</strong><small>{item.project}</small></span><TinyPill tone={item.status === 'Review' ? 'neutral' : 'neutral'}><i className={`mini-status-dot ${item.status === 'On track' ? 'is-amber' : ''}`} />{item.status}</TinyPill></button>)}</div>
      </Panel>
    </div>

    <Panel className="all-projects-panel">
      <div className="all-projects-heading"><div><CardHeading title="All projects" detail="Sorted by next focus block" /></div><div className="projects-filter-tabs" aria-label="Project filters">{(['All', 'Active', 'Done'] as const).map((item) => <button key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      <div className="table-wrap"><table className="projects-overview-table"><thead><tr><th>Project</th><th>Next block</th><th>This week</th><th>Progress</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>{visibleProjects.map((project) => <ProjectRow key={project.id} project={project} onOpen={() => openProject(project)} />)}</tbody></table></div>
      {!visibleProjects.length && <p className="projects-empty-filter">No projects in this view.</p>}
    </Panel>
    {dialogOpen && <NewProjectDialog onClose={() => setDialogOpen(false)} onCreate={(name) => { addProject(name); setDialogOpen(false); notify(`${name} added to projects`); }} />}
  </div>;
}

function MilestoneTimeline() {
  const items = [
    { title: 'Concept approved', detail: 'The brief is signed off', state: 'done', when: 'Oct 12' },
    { title: 'Moodboard', detail: 'Review the visual direction', state: 'current', when: 'Oct 22' },
    { title: 'First draft', detail: 'Identity system and templates', state: 'upcoming', when: 'Nov 04' },
    { title: 'Final handoff', detail: 'Files ready across every format', state: 'upcoming', when: 'Nov 14' },
  ];
  return <div className="brand-milestone-timeline">{items.map((item, index) => <div className={`brand-milestone-step brand-milestone-step--${item.state}`} key={item.title}><span className="brand-milestone-marker">{item.state === 'done' ? <Check size={12} /> : String(index + 1).padStart(2, '0')}</span><div className="brand-milestone-copy"><strong>{item.title}</strong><small>{item.detail}</small></div><span className="brand-milestone-date">{item.when}</span></div>)}</div>;
}

function DeliverablesTable() {
  return <div className="table-wrap"><table className="deliverables-table"><thead><tr><th>Deliverable</th><th>Status</th><th>Owner</th><th>Due</th><th>Progress</th></tr></thead><tbody>{deliverables.map((item) => <tr key={item.name}><td><span className="deliverable-name"><FileText size={14} />{item.name}</span></td><td><TinyPill tone={item.status === 'In review' ? 'amber' : 'neutral'}>{item.status}</TinyPill></td><td>{item.owner}</td><td>{item.date}</td><td><span className="deliverable-progress"><ProgressBar value={item.progress} /><small>{item.progress}%</small></span></td></tr>)}</tbody></table></div>;
}

function ProjectTabContent({ tab, notify, projectFiles, focusPlanAdded, onAddFocusPlan, onAddFile }: { tab: ProjectTab; notify: (message: string) => void; projectFiles: ProjectFile[]; focusPlanAdded: boolean; onAddFocusPlan: () => void; onAddFile: () => void }) {
  if (tab === 'Milestones') return <Panel className="detail-content-card"><CardHeading title="Milestones" detail="Four steps from concept to handoff" /><MilestoneTimeline /><div className="milestone-footer"><span>Next milestone <strong>Moodboard review · Oct 22</strong></span><button className="button-outline" onClick={onAddFocusPlan}>{focusPlanAdded ? 'Added to focus plan' : 'Add to focus plan'} <ArrowRight size={12} /></button></div></Panel>;
  if (tab === 'Files') return <Panel className="detail-content-card"><CardHeading title="Project files" detail={`${projectFiles.length} working files · latest activity first`} /><div className="project-file-list">{projectFiles.map((file) => <button key={file.name} className="project-file-row" onClick={() => notify(`${file.name} selected`)}><span className="project-file-icon"><FileText size={15} /></span><span className="project-file-copy"><strong>{file.name}</strong><small>{file.detail}</small></span><TinyPill>{file.type}</TinyPill><ArrowUpRight size={13} /></button>)}</div><button className="button-outline upload-file-button" onClick={onAddFile}>Add a file <Plus size={12} /></button></Panel>;
  if (tab === 'Activity') return <Panel className="detail-content-card"><CardHeading title="Recent activity" detail="A tidy record of the work so far" /><div className="project-activity-list"><div><span className="activity-bullet activity-bullet--amber" /><p><strong>Mia approved the concept</strong><small>Oct 18 · Milestone completed</small></p></div><div><span className="activity-bullet" /><p><strong>Social templates moved to in progress</strong><small>Oct 17 · Deliverable updated by Lena</small></p></div><div><span className="activity-bullet" /><p><strong>Brand guidelines v2 uploaded</strong><small>Oct 16 · File added by Mia</small></p></div><div><span className="activity-bullet" /><p><strong>Project brief created</strong><small>Oct 12 · Project started</small></p></div></div></Panel>;
  return <div className="brand-overview-content"><Panel className="detail-content-card"><CardHeading title="Milestones" detail="A clear path to final handoff" /><MilestoneTimeline /><button className="milestone-more-button" onClick={() => notify('Moodboard selected · ready for review')}>View milestone plan <ArrowRight size={12} /></button></Panel><Panel className="detail-content-card deliverables-card"><CardHeading title="Deliverables" detail="Four pieces moving together" action={<TinyPill>4 items</TinyPill>} /><DeliverablesTable /></Panel></div>;
}

export function BrandRefreshPage() {
  const navigate = useNavigate();
  const { notify, projectFiles, focusPlanAdditions, addFocusPlanBlock, addProjectFile } = useDashboard();
  const [tab, setTab] = useState<ProjectTab>('Overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusPlanAdded = focusPlanAdditions.some((item) => item.id === 'brand-moodboard-review');
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (file) addProjectFile({ name: file.name, size: file.size, type: file.type });
    event.currentTarget.value = '';
  }
  const tabs: ProjectTab[] = ['Overview', 'Milestones', 'Files', 'Activity'];
  return <div className="brand-project-page">
    <input ref={fileInputRef} className="visually-hidden-file-input" type="file" aria-label="Choose a project file" onChange={handleFileChange} />
    <InlineBackLink to="/projects">All projects</InlineBackLink>
    <div className="brand-detail-heading"><div><PageEyebrow>Project</PageEyebrow><div className="brand-title-line"><h1 className="display-title">Brand Refresh</h1><TinyPill tone="amber"><i className="inline-dot" />68% complete</TinyPill></div><p className="page-detail">A lighter, more confident identity for the studio — built to travel across print, product and pitch decks.</p></div><button className="button-outline" onClick={() => { navigate('/focus'); notify('Focus block opened for Brand Refresh'); }}><Clock3 size={13} /> Open focus block</button></div>
    <div className="brand-project-tabs" role="tablist" aria-label="Brand Refresh sections">{tabs.map((item) => <button role="tab" aria-selected={tab === item} key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>
    <div className="brand-detail-grid"><div className="brand-detail-main"><ProjectTabContent tab={tab} notify={notify} projectFiles={projectFiles} focusPlanAdded={focusPlanAdded} onAddFocusPlan={() => { addFocusPlanBlock({ id: 'brand-moodboard-review', title: 'Moodboard review with Mia', day: 'Mon 27 Oct', time: '14:00–15:00', project: 'Brand Refresh' }); notify(focusPlanAdded ? 'Moodboard review is already in your focus plan' : 'Moodboard review added to your focus plan'); }} onAddFile={() => fileInputRef.current?.click()} /></div><aside className="brand-detail-rail">
      <Panel className="brand-status-panel"><div className="brand-status-heading"><span className="brand-status-indicator" /><strong>On track</strong><button className="icon-circle" aria-label="Project status details" onClick={() => notify('Brand Refresh is on track for Nov 14')}><ArrowUpRight size={13} /></button></div><div className="brand-status-due"><span>Due date</span><strong>Nov 14</strong></div><div className="brand-progress-heading"><span>Progress</span><strong>68%</strong></div><ProgressBar value={68} /><div className="brand-budget-line"><span>Budget used</span><strong>62% <small>· within plan</small></strong></div><div className="brand-next-milestone"><small>NEXT MILESTONE</small><strong>Moodboard review</strong><span>Oct 22 · with Mia</span></div></Panel>
      <Panel className="zenith-note-panel"><div className="zenith-note-label"><span><Sparkles size={13} /></span>Zenith’s note</div><p>The visual direction feels distinct. Keep the system light enough to travel from screen to print.</p><button className="button-quiet" onClick={() => notify('Zenith’s note saved to Brand Refresh')}>Save note <ArrowRight size={12} /></button></Panel>
      <Panel className="brand-files-panel"><CardHeading title="Files" detail={`${projectFiles.length} items in this project`} action={<button className="icon-circle" aria-label="Open project files" onClick={() => setTab('Files')}><ArrowUpRight size={13} /></button>} />{projectFiles.slice(0, 3).map((file) => <button className="brand-file-mini" key={file.name} onClick={() => notify(`${file.name} selected`)}><span><FileText size={13} /></span><span><strong>{file.name}</strong><small>{file.type} · {file.detail.split(' · ')[0]}</small></span></button>)}<button className="all-files-link" onClick={() => setTab('Files')}>View all files <ArrowRight size={11} /></button></Panel>
    </aside></div>
  </div>;
}
