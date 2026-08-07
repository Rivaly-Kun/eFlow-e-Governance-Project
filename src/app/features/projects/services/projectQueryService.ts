import { supabase } from '../../../../lib/supabase';
import { rowToProject } from './projectMappers';
import type { Project } from './types';

const projectListeners = new Set<(projects: Project[]) => void>();

export async function fetchAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    // Table may not exist yet (migration not applied) — degrade gracefully.
    if (error.code === '42P01') return [];
    console.error('Failed to fetch projects:', error);
    return [];
  }
  return (data || []).map(rowToProject);
}

export async function notifyProjectListeners() {
  const projects = await fetchAllProjects();
  projectListeners.forEach((cb) => { try { cb(projects); } catch (e) { console.error(e); } });
}

export function subscribeToProjects(callback: (projects: Project[]) => void): () => void {
  projectListeners.add(callback);
  fetchAllProjects().then(callback);

  const channelId = `projects-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => notifyProjectListeners())
    .subscribe();

  return () => {
    projectListeners.delete(callback);
    supabase.removeChannel(channel);
  };
}

// ─── createProject ───────────────────────────────────────────────
