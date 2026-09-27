import { useEffect, useMemo, useRef, useState } from 'react';
import { dsaSyllabus, mernSyllabus, sscSyllabus } from './data/syllabus';
import { useLocalStorage } from './hooks/useLocalStorage';
import ProgressBar from './components/ProgressBar';
import StatusSelect from './components/StatusSelect';
import { getFiles, openStoredFile, removeFile, saveFile } from './utils/fileStorage';

const nav = [['Dashboard', '⌂'], ['Daily Planner', '☷'], ['Progress', '◔'], ['SSC CGL', '◫'], ['PYQs', '▤'], ['MERN Roadmap', '⌘'], ['DSA Tracker', '⌁'], ['Focus Timer', '◷'], ['Notes', '✎']];
const defaultTasks = [
  { id: 1, text: 'Revise Percentage formulas', area: 'SSC', done: false },
  { id: 2, text: 'Complete React Hooks lesson', area: 'MERN', done: false },
  { id: 3, text: 'Solve 3 Array problems', area: 'DSA', done: false }
];
const keyFor = (category, topic) => `${category}::${topic}`;
const progress = (statuses) => {
  const values = Object.values(statuses); if (!values.length) return 0;
  return Math.round(values.reduce((sum, s) => sum + (s === 'Completed' ? 1 : s === 'Revision' ? 1 : s === 'Learning' ? .5 : 0), 0) / values.length * 100);
};
const formatTime = secs => `${Math.floor(secs / 3600)}h ${Math.floor(secs % 3600 / 60)}m`;
const sscTopicsBySubject = Object.fromEntries(sscSyllabus.map(({ category, topics }) => [category, topics.map(([topic]) => topic)]));
const notesTopics = {
  SSC: sscSyllabus.flatMap(({ category, topics }) => topics.map(([topic]) => `${category} — ${topic}`)),
  MERN: mernSyllabus.flatMap(({ category, topics }) => topics.map(topic => `${category} — ${topic}`)),
  DSA: dsaSyllabus.map(([topic]) => topic)
};
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const todayKey = () => new Date().toISOString().slice(0, 10);
const categoryForArea = area => area === 'SSC' ? 'SSC CGL' : area;

export default function App() {
  const [page, setPage] = useState('Dashboard');
  const [ssc, setSsc] = useLocalStorage('studyflow-ssc', {});
  const [mern, setMern] = useLocalStorage('studyflow-mern', {});
  const [dsa, setDsa] = useLocalStorage('studyflow-dsa', {});
  const [tasks, setTasks] = useLocalStorage('studyflow-tasks', defaultTasks);
  const [sessions, setSessions] = useLocalStorage('studyflow-sessions', []);
  const [streak, setStreak] = useLocalStorage('studyflow-streak', { count: 0, best: 0, lastDate: '' });
  const [pyqEntries, setPyqEntries] = useLocalStorage('studyflow-pyq-entries', []);
  const [notes, setNotes] = useLocalStorage('studyflow-notes', []);
  const [theme, setTheme] = useLocalStorage('studyflow-theme', 'light');
  const sscTotal = sscSyllabus.flatMap(g => g.topics.map(([topic]) => keyFor(g.category, topic)));
  const mernTotal = mernSyllabus.flatMap(g => g.topics.map(topic => keyFor(g.category, topic)));
  const sscProgress = progress(Object.fromEntries(sscTotal.map(k => [k, ssc[k] || 'Not Started'])));
  const mernProgress = progress(Object.fromEntries(mernTotal.map(k => [k, mern[k] || 'Not Started'])));
  const dsaTotals = dsaSyllabus.reduce((a, [, total]) => a + total, 0);
  const dsaSolved = dsaSyllabus.reduce((a, [name]) => a + Number(dsa[name]?.solved || 0), 0);
  const dsaProgress = Math.round(dsaSolved / dsaTotals * 100);
  const today = new Date().toDateString();
  const todaySeconds = sessions.filter(s => new Date(s.date).toDateString() === today).reduce((a, s) => a + s.seconds, 0);
  const todaysTasks = tasks.filter(task => !task.planDate || task.planDate === todayKey());
  const plannedMinutes = todaysTasks.reduce((sum, task) => sum + Number(task.duration || 60), 0);
  const completedMinutes = todaysTasks.filter(task => task.done).reduce((sum, task) => sum + Number(task.duration || 60), 0);
  const nextTopic = sscTotal.find(k => !ssc[k] || ssc[k] === 'Not Started')?.split('::')[1] || mernTotal.find(k => !mern[k] || mern[k] === 'Not Started')?.split('::')[1] || 'Plan your next revision';
  const updateStatus = (setter, map, category, topic, status) => setter({ ...map, [keyFor(category, topic)]: status });
  const registerStudyDay = () => {
    const date = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    setStreak(current => {
      const count = current.lastDate === date ? current.count : current.lastDate === yesterday ? current.count + 1 : 1;
      return { count, best: Math.max(current.best || current.count || 0, count), lastDate: date };
    });
  };
  const recordSession = (seconds, area) => {
    if (seconds < 30) return;
    setSessions([...sessions, { id: Date.now(), date: new Date().toISOString(), seconds, area }]);
    registerStudyDay();
  };
  const common = { ssc, mern, dsa, tasks: todaysTasks, setTasks, setDsa, sscProgress, mernProgress, dsaProgress, dsaSolved, dsaTotals, todaySeconds, streak, nextTopic, updateStatus, setSsc, setMern, recordSession, registerStudyDay, plannedMinutes, completedMinutes };
  return <div className={`app-shell ${theme === 'dark' ? 'dark' : ''}`}>
    <aside><div className="brand"><span>✦</span> StudyFlow</div><p className="side-label">YOUR PREPARATION</p>{nav.map(([label, icon]) => <button key={label} className={page === label ? 'nav active' : 'nav'} onClick={() => setPage(label)}><i>{icon}</i>{label}</button>)}<button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span>{theme === 'dark' ? '☀' : '☾'}</span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><div className="side-footer">Small daily steps<br />create big results.</div></aside>
    <main><header><div><p className="eyebrow">STUDY DASHBOARD</p><h1>{page === 'Dashboard' ? 'Good morning, learner!' : page}</h1></div><div className="date">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</div></header>
      {page === 'Dashboard' && <Dashboard {...common} onStartFocus={() => setPage('Focus Timer')} />}
      {page === 'Daily Planner' && <DailyPlanner tasks={todaysTasks} setTasks={setTasks} registerStudyDay={registerStudyDay} plannedMinutes={plannedMinutes} completedMinutes={completedMinutes} />}
      {page === 'Progress' && <ProgressAnalytics {...common} sessions={sessions} />}
      {page === 'SSC CGL' && <Syllabus title="SSC CGL Syllabus" description="Build a strong foundation, one topic at a time." groups={sscSyllabus} statuses={ssc} setStatuses={setSsc} updateStatus={updateStatus} hasPriority />}
      {page === 'PYQs' && <PYQs entries={pyqEntries} setEntries={setPyqEntries} />}
      {page === 'MERN Roadmap' && <Syllabus title="MERN Roadmap" description="Learn the stack in a clear, practical order." groups={mernSyllabus} statuses={mern} setStatuses={setMern} updateStatus={updateStatus} />}
      {page === 'DSA Tracker' && <DSA {...common} />}
      {page === 'Focus Timer' && <FocusTimer recordSession={recordSession} />}
      {page === 'Notes' && <Notes notes={notes} setNotes={setNotes} />}
    </main>
  </div>;
}

function Dashboard({ sscProgress, mernProgress, dsaProgress, todaySeconds, streak, tasks, setTasks, nextTopic, onStartFocus, registerStudyDay }) {
  const cards = [['SSC CGL', sscProgress, 'blue'], ['MERN Roadmap', mernProgress, 'purple'], ['DSA Practice', dsaProgress, 'orange']];
  return <><section className="hero"><div><span className="pill">✦ Keep going</span><h2>Your goals are within reach.</h2><p>Focus on today. Progress will follow.</p></div><button className="primary" onClick={onStartFocus}>Start focus session <span>→</span></button></section>
    <section className="stats-grid">{cards.map(([name, value, color]) => <article className="stat-card" key={name}><div className="card-top"><span>{name}</span><b>{value}%</b></div><ProgressBar value={value} color={color} /><small>{value === 100 ? 'All done — revise often!' : `${100 - value}% left to cover`}</small></article>)}<article className="stat-card time"><span>Today’s study time</span><b>{formatTime(todaySeconds)} <em>/ 8h</em></b><ProgressBar value={todaySeconds / 28800 * 100} color="green" /><small>Stay consistent, not perfect.</small></article></section>
    <section className="two-col"><article className="panel"><div className="panel-title"><div><p className="eyebrow">TODAY</p><h3>Study tasks</h3></div><span>{tasks.filter(t => t.done).length}/{tasks.length} done</span></div>{tasks.map(task => <label className="task" key={task.id}><input type="checkbox" checked={task.done} onChange={() => { if (!task.done) registerStudyDay(); setTasks(current => current.map(t => t.id === task.id ? { ...t, done: !t.done } : t)); }} /><span className={`check ${task.done ? 'checked' : ''}`}>✓</span><span className={task.done ? 'task-done' : ''}>{task.text}<small>{task.category || categoryForArea(task.area)}</small></span></label>)}</article>
      <article className="panel next"><p className="eyebrow">UP NEXT</p><div className="next-icon">◈</div><h3>{nextTopic}</h3><p>Pick up where you left off and keep the momentum going.</p><div className="streak">🔥 <b>{streak.count} day streak</b><span>Best: {streak.best || streak.count || 0} days</span></div></article></section></>;
}

function DailyPlanner({ tasks, setTasks, registerStudyDay, plannedMinutes, completedMinutes }) {
  const [name, setName] = useState(''); const [category, setCategory] = useState('SSC CGL'); const [duration, setDuration] = useState('60'); const [editingId, setEditingId] = useState(null);
  const reset = () => { setName(''); setCategory('SSC CGL'); setDuration('60'); setEditingId(null); };
  const saveTask = event => { event.preventDefault(); if (!name.trim() || Number(duration) < 1) return; const task = { id: editingId || makeId(), text: name.trim(), category, area: category === 'SSC CGL' ? 'SSC' : category, duration: Number(duration), done: editingId ? tasks.find(item => item.id === editingId)?.done || false : false, planDate: todayKey() }; setTasks(current => editingId ? current.map(item => item.id === editingId ? task : item) : [...current, task]); reset(); };
  const toggleTask = task => { if (!task.done) registerStudyDay(); setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done } : item)); };
  const editTask = task => { setEditingId(task.id); setName(task.text); setCategory(task.category || categoryForArea(task.area)); setDuration(String(task.duration || 60)); };
  return <><section className="page-intro"><div><h2>Daily Planner</h2><p>Make a realistic plan for today, then tick it off.</p></div><div className="overall"><b>{formatTime(completedMinutes * 60)} / {formatTime(plannedMinutes * 60)}</b><span>Completed / planned</span></div></section><section className="planner-summary"><article><span>Today’s plan</span><b>{formatTime(plannedMinutes * 60)}</b></article><article><span>Completed time</span><b>{formatTime(completedMinutes * 60)}</b></article><article><span>8-hour target</span><b>{Math.round(completedMinutes / 480 * 100)}%</b><ProgressBar value={completedMinutes / 480 * 100} color="green" /></article></section><section className="entry-panel panel"><h3>{editingId ? 'Edit task' : 'Add a study task'}</h3><form className="planner-form" onSubmit={saveTask}><label>Task name<input value={name} onChange={e => setName(e.target.value)} placeholder="What will you study?" required /></label><label>Category<select value={category} onChange={e => setCategory(e.target.value)}>{['SSC CGL', 'MERN', 'DSA'].map(item => <option key={item}>{item}</option>)}</select></label><label>Planned duration (minutes)<input type="number" min="1" max="720" value={duration} onChange={e => setDuration(e.target.value)} required /></label><div className="form-actions"><button className="primary" type="submit">{editingId ? 'Save task' : 'Add task'}</button>{editingId && <button className="secondary" type="button" onClick={reset}>Cancel</button>}</div></form></section><section className="panel planner-list"><div className="panel-title"><div><p className="eyebrow">TODAY’S PLAN</p><h3>Your tasks</h3></div><span>{tasks.filter(task => task.done).length}/{tasks.length} complete</span></div>{tasks.length ? tasks.map(task => <div className="planner-task" key={task.id}><label className="task"><input type="checkbox" checked={task.done} onChange={() => toggleTask(task)} /><span className={`check ${task.done ? 'checked' : ''}`}>✓</span><span className={task.done ? 'task-done' : ''}><b>{task.text}</b><small>{task.category || categoryForArea(task.area)} · {task.duration || 60} min</small></span></label><div className="row-actions"><button className="text-button" onClick={() => editTask(task)}>Edit</button><button className="text-button danger" onClick={() => setTasks(current => current.filter(item => item.id !== task.id))}>Delete</button></div></div>) : <p className="empty-copy">Add a task to begin your plan for today.</p>}</section></>;
}

function ProgressAnalytics({ sessions, todaySeconds, ssc, sscProgress, mernProgress, dsaProgress, dsaSolved, dsaTotals }) {
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const weeklySeconds = sessions.filter(session => new Date(session.date) >= start).reduce((sum, session) => sum + session.seconds, 0);
  const timeFor = area => sessions.filter(session => categoryForArea(session.area) === area).reduce((sum, session) => sum + session.seconds, 0);
  const subjectProgress = sscSyllabus.map(group => ({ name: group.category, value: progress(Object.fromEntries(group.topics.map(([topic]) => [keyFor(group.category, topic), ssc[keyFor(group.category, topic)] || 'Not Started']))) }));
  const metrics = [['Today', formatTime(todaySeconds)], ['This week', formatTime(weeklySeconds)], ['SSC CGL', formatTime(timeFor('SSC CGL'))], ['MERN', formatTime(timeFor('MERN'))], ['DSA', formatTime(timeFor('DSA'))]];
  return <><section className="page-intro"><div><h2>Progress Analytics</h2><p>A simple view of your study time and preparation progress.</p></div><div className="overall"><b>{formatTime(weeklySeconds)}</b><span>This week</span></div></section><section className="analytics-grid">{metrics.map(([label, value]) => <article className="stat-card" key={label}><span>{label} study time</span><b>{value}</b><small>From focus sessions</small></article>)}</section><section className="two-col analytics-details"><article className="panel"><div className="panel-title"><div><p className="eyebrow">SSC CGL</p><h3>Subject progress</h3></div><b>{sscProgress}%</b></div>{subjectProgress.map(subject => <div className="subject-progress" key={subject.name}><div><span>{subject.name}</span><b>{subject.value}%</b></div><ProgressBar value={subject.value} /></div>)}</article><article className="panel"><p className="eyebrow">PREPARATION</p><h3>Roadmap progress</h3><div className="roadmap-progress"><div><span>MERN</span><b>{mernProgress}%</b><ProgressBar value={mernProgress} color="purple" /></div><div><span>DSA problems</span><b>{dsaSolved}/{dsaTotals}</b><ProgressBar value={dsaProgress} color="orange" /></div></div></article></section></>;
}

function Syllabus({ title, description, groups, statuses, setStatuses, updateStatus, hasPriority }) {
  const keys = groups.flatMap(g => g.topics.map(t => keyFor(g.category, Array.isArray(t) ? t[0] : t)));
  const pct = progress(Object.fromEntries(keys.map(k => [k, statuses[k] || 'Not Started'])));
  return <><section className="page-intro"><div><h2>{title}</h2><p>{description}</p></div><div className="overall"><b>{pct}%</b><span>Overall progress</span></div></section><ProgressBar value={pct} />
    <div className="syllabus-grid">{groups.map(group => <section className="syllabus-card" key={group.category}><h3>{group.category}</h3><div className="topic-list">{group.topics.map(item => { const [topic, priority] = Array.isArray(item) ? item : [item]; const current = statuses[keyFor(group.category, topic)] || 'Not Started'; return <div className="topic-row" key={topic}><div><b>{topic}</b>{hasPriority && <span className={`priority ${priority.toLowerCase()}`}>{priority}</span>}</div><StatusSelect value={current} onChange={value => updateStatus(setStatuses, statuses, group.category, topic, value)} /></div>; })}</div></section>)}</div></>;
}

function DSA({ dsa, setDsa, dsaSolved, dsaTotals, dsaProgress }) {
  return <><section className="page-intro"><div><h2>DSA Problem Tracker</h2><p>A structured 450-problem plan. Every solved problem adds up.</p></div><div className="overall"><b>{dsaSolved}/{dsaTotals}</b><span>Problems solved</span></div></section><ProgressBar value={dsaProgress} color="orange" />
    <div className="dsa-grid">{dsaSyllabus.map(([topic, total]) => { const solved = Math.min(total, Number(dsa[topic]?.solved || 0)); return <article className="dsa-card" key={topic}><div><h3>{topic}</h3><span>{solved} / {total} solved</span></div><ProgressBar value={solved / total * 100} color="orange" /><div className="counter"><button onClick={() => setDsa({ ...dsa, [topic]: { solved: Math.max(0, solved - 1) } })}>−</button><b>{solved}</b><button onClick={() => setDsa({ ...dsa, [topic]: { solved: Math.min(total, solved + 1) } })}>+</button></div></article>; })}</div></>;
}

function FileRows({ files, onDelete }) {
  if (!files.length) return <p className="empty-copy">No files uploaded yet.</p>;
  return <div className="file-list">{files.map(file => <div className="file-row" key={file.id}><div><b>{file.name}</b><span>{file.year && `${file.year} · `}{file.subject}{file.topic && ` · ${file.topic}`}</span></div><div className="row-actions"><button className="text-button" onClick={() => openStoredFile(file.id)}>View</button><button className="text-button danger" onClick={() => onDelete(file.id)}>Delete</button></div></div>)}</div>;
}

function PYQs({ entries, setEntries }) {
  const subjects = Object.keys(sscTopicsBySubject);
  const [subject, setSubject] = useState(subjects[0]);
  const [topic, setTopic] = useState(sscTopicsBySubject[subjects[0]][0]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [attempted, setAttempted] = useState(''); const [correct, setCorrect] = useState(''); const [wrong, setWrong] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); const [files, setFiles] = useState([]);
  const refreshFiles = () => getFiles('pyq').then(setFiles).catch(() => setFiles([]));
  useEffect(() => { refreshFiles(); }, []);
  const changeSubject = value => { setSubject(value); setTopic(sscTopicsBySubject[value][0]); };
  const saveEntry = async event => {
    event.preventDefault(); const total = Number(attempted); const right = Number(correct); const incorrect = Number(wrong); const hasStats = [attempted, correct, wrong].some(Boolean);
    if ((!hasStats && !selectedFile) || (hasStats && (!total || right + incorrect > total))) return;
    if (hasStats) setEntries([...entries, { id: makeId(), year, subject, topic, attempted: total, correct: right, wrong: incorrect, createdAt: Date.now() }]);
    if (selectedFile) { await saveFile({ id: makeId(), kind: 'pyq', file: selectedFile, name: selectedFile.name, type: selectedFile.type, year, subject, topic, createdAt: Date.now() }); await refreshFiles(); setSelectedFile(null); event.target.reset(); }
    setAttempted(''); setCorrect(''); setWrong('');
  };
  const topicProgress = Object.values(entries.reduce((all, entry) => { const key = `${entry.subject}::${entry.topic}`; const item = all[key] || { subject: entry.subject, topic: entry.topic, attempted: 0, correct: 0, wrong: 0 }; item.attempted += entry.attempted; item.correct += entry.correct; item.wrong += entry.wrong; all[key] = item; return all; }, {}));
  return <><section className="page-intro"><div><h2>SSC CGL PYQs</h2><p>Log practice by year and review the topics that need attention.</p></div><div className="overall"><b>{entries.reduce((sum, entry) => sum + entry.attempted, 0)}</b><span>Questions attempted</span></div></section>
    <section className="entry-panel panel"><h3>Log PYQ practice</h3><form className="entry-form" onSubmit={saveEntry}><label>Year<input value={year} onChange={e => setYear(e.target.value)} inputMode="numeric" required /></label><label>Subject<select value={subject} onChange={e => changeSubject(e.target.value)}>{subjects.map(item => <option key={item}>{item}</option>)}</select></label><label>Topic<select value={topic} onChange={e => setTopic(e.target.value)}>{sscTopicsBySubject[subject].map(item => <option key={item}>{item}</option>)}</select></label><label>Attempted<input type="number" min="1" value={attempted} onChange={e => setAttempted(e.target.value)} /></label><label>Correct<input type="number" min="0" value={correct} onChange={e => setCorrect(e.target.value)} /></label><label>Wrong<input type="number" min="0" value={wrong} onChange={e => setWrong(e.target.value)} /></label><label className="file-input">PYQ PDF or image<input type="file" accept="application/pdf,image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} /><span>{selectedFile?.name || 'Choose file (optional)'}</span></label><button className="primary" type="submit">Save practice</button></form></section>
    <section className="panel data-panel"><div className="panel-title"><div><p className="eyebrow">BY TOPIC</p><h3>PYQ progress</h3></div><span>{topicProgress.length} topics logged</span></div>{topicProgress.length ? <div className="table-wrap"><table><thead><tr><th>Topic</th><th>Attempted</th><th>Correct</th><th>Accuracy</th><th>Review</th></tr></thead><tbody>{topicProgress.map(item => { const accuracy = Math.round(item.correct / item.attempted * 100); return <tr key={`${item.subject}-${item.topic}`}><td><b>{item.topic}</b><small>{item.subject}</small></td><td>{item.attempted}</td><td>{item.correct}</td><td><span className={accuracy < 60 ? 'accuracy low-accuracy' : 'accuracy'}>{accuracy}%</span></td><td>{accuracy < 60 ? <span className="needs-practice">Needs Practice</span> : <span className="on-track">On track</span>}</td></tr>; })}</tbody></table></div> : <p className="empty-copy">Add your first PYQ session to see topic-wise progress.</p>}</section>
    <section className="panel uploads-panel"><div className="panel-title"><div><p className="eyebrow">STORED LOCALLY</p><h3>PYQ files</h3></div><span>{files.length} files</span></div><FileRows files={files} onDelete={async id => { await removeFile(id); refreshFiles(); }} /></section></>;
}

function Notes({ notes, setNotes }) {
  const [area, setArea] = useState('SSC'); const [topic, setTopic] = useState(notesTopics.SSC[0]);
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [important, setImportant] = useState(false); const [revisionDate, setRevisionDate] = useState(''); const [file, setFile] = useState(null); const [editingId, setEditingId] = useState(null); const [files, setFiles] = useState([]);
  const refreshFiles = () => getFiles('note').then(setFiles).catch(() => setFiles([]));
  useEffect(() => { refreshFiles(); }, []);
  const changeArea = value => { setArea(value); setTopic(notesTopics[value][0]); };
  const reset = () => { setTitle(''); setContent(''); setImportant(false); setRevisionDate(''); setFile(null); setEditingId(null); };
  const saveNote = async event => { event.preventDefault(); if (!title.trim()) return; const id = editingId || makeId(); const note = { id, title: title.trim(), content, area, topic, important, revisionDate, updatedAt: Date.now() }; setNotes(editingId ? notes.map(item => item.id === id ? note : item) : [note, ...notes]); if (file) { await saveFile({ id: makeId(), kind: 'note', noteId: id, file, name: file.name, type: file.type, subject: area, topic, createdAt: Date.now() }); await refreshFiles(); } reset(); event.target.reset(); };
  const editNote = note => { setEditingId(note.id); setTitle(note.title); setContent(note.content); setArea(note.area); setTopic(note.topic); setImportant(note.important); setRevisionDate(note.revisionDate || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const deleteNote = async id => { setNotes(notes.filter(note => note.id !== id)); const attached = files.filter(fileItem => fileItem.noteId === id); await Promise.all(attached.map(fileItem => removeFile(fileItem.id))); refreshFiles(); };
  return <><section className="page-intro"><div><h2>Notes</h2><p>Keep concise notes connected to the topics you are studying.</p></div><div className="overall"><b>{notes.length}</b><span>Saved notes</span></div></section>
    <section className="entry-panel panel"><h3>{editingId ? 'Edit note' : 'Create note'}</h3><form className="note-form" onSubmit={saveNote}><label>Study area<select value={area} onChange={e => changeArea(e.target.value)}>{Object.keys(notesTopics).map(item => <option key={item}>{item}</option>)}</select></label><label>Topic<select value={topic} onChange={e => setTopic(e.target.value)}>{notesTopics[area].map(item => <option key={item}>{item}</option>)}</select></label><label className="note-title">Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. React hooks recap" required /></label><label>Revision date<input type="date" value={revisionDate} onChange={e => setRevisionDate(e.target.value)} /></label><label className="important-check"><input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)} /> Mark as important</label><label className="file-input">PDF or image attachment<input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} /><span>{file?.name || 'Choose file (optional)'}</span></label><label className="note-content">Note<textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your note here..." rows="5" /></label><div className="form-actions"><button className="primary" type="submit">{editingId ? 'Save changes' : 'Save note'}</button>{editingId && <button className="secondary" type="button" onClick={reset}>Cancel</button>}</div></form></section>
    <section className="notes-grid">{notes.map(note => { const noteFiles = files.filter(fileItem => fileItem.noteId === note.id); return <article className={`note-card ${note.important ? 'important-note' : ''}`} key={note.id}><div className="note-head"><div><span className="note-tag">{note.area}</span>{note.important && <span className="important-tag">Important</span>}</div><div className="row-actions"><button className="text-button" onClick={() => editNote(note)}>Edit</button><button className="text-button danger" onClick={() => deleteNote(note.id)}>Delete</button></div></div><h3>{note.title}</h3><p className="note-topic">{note.topic}</p>{note.content && <p className="note-content-text">{note.content}</p>}{note.revisionDate && <p className="revision">Revision: {new Date(`${note.revisionDate}T00:00:00`).toLocaleDateString()}</p>}{noteFiles.map(fileItem => <div className="note-file" key={fileItem.id}><span>{fileItem.name}</span><button className="text-button" onClick={() => openStoredFile(fileItem.id)}>View</button><button className="text-button danger" onClick={async () => { await removeFile(fileItem.id); refreshFiles(); }}>Delete</button></div>)}</article>; })}</section>{!notes.length && <p className="empty-copy notes-empty">Your saved notes will appear here.</p>}</>;
}

function FocusTimer({ recordSession }) {
  const [area, setArea] = useState('SSC'); const [custom, setCustom] = useState('45'); const [duration, setDuration] = useState(1800); const [left, setLeft] = useState(1800); const [running, setRunning] = useState(false); const endAt = useRef(null); const initial = useRef(1800);
  useEffect(() => { if (!running) return; const tick = () => { const remaining = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)); setLeft(remaining); if (!remaining) { setRunning(false); setLeft(initial.current); recordSession(initial.current, area); if ('Notification' in window && Notification.permission === 'granted') new Notification('Focus session complete!', { body: `Great work on ${area}. Your study time was saved.` }); else window.alert(`Focus session complete! Your ${area} study time was saved.`); } }; tick(); const id = setInterval(tick, 500); return () => clearInterval(id); }, [running, area, recordSession]);
  const choose = seconds => { if (!running) { setDuration(seconds); setLeft(seconds); initial.current = seconds; } };
  const start = () => { if (!running) { endAt.current = Date.now() + left * 1000; setRunning(true); if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } };
  const pause = () => { setLeft(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))); setRunning(false); };
  const end = () => { const done = initial.current - left; if (done >= 30) recordSession(done, area); setRunning(false); setLeft(duration); initial.current = duration; };
  const mins = String(Math.floor(left / 60)).padStart(2, '0'); const secs = String(left % 60).padStart(2, '0');
  return <div className="timer-page"><section className="timer-card"><p className="eyebrow">FOCUS MODE</p><h2>Make this session count.</h2><div className="timer-display">{mins}<span>:</span>{secs}</div><p className="timer-label">{area} · {running ? 'Session in progress' : 'Ready when you are'}</p><div className="timer-actions">{running ? <button className="primary" onClick={pause}>Pause</button> : <button className="primary" onClick={start}>{left === duration ? 'Start session' : 'Resume session'}</button>}<button className="secondary" onClick={end}>End session</button></div></section>
    <section className="timer-settings panel"><h3>Set your focus</h3><label className="setting-label">What are you studying?</label><div className="choice-row">{['SSC', 'MERN', 'DSA'].map(x => <button className={area === x ? 'choice selected' : 'choice'} onClick={() => setArea(x)} key={x}>{x}</button>)}</div><label className="setting-label">Session length</label><div className="choice-row">{[[30, '30 min'], [60, '1 hour'], [120, '2 hours']].map(([m, label]) => <button className={duration === m * 60 ? 'choice selected' : 'choice'} onClick={() => choose(m * 60)} key={m}>{label}</button>)}</div><div className="custom"><input type="number" min="1" max="480" value={custom} onChange={e => setCustom(e.target.value)} /><span>minutes</span><button className="secondary" onClick={() => choose(Math.max(1, Number(custom || 1)) * 60)}>Set custom</button></div><p className="hint">The timer uses real time, so it stays accurate when you switch tabs.</p></section></div>;
}
