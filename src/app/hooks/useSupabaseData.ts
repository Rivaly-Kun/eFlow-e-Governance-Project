// ─── Supabase Realtime Data Hooks ────────────────────────────────
// Wraps supabaseService subscriptions into clean React hooks.

import { useState, useEffect, useMemo } from 'react';
import {
  fetchAllOrgs,
  fetchAllProfiles,
  subscribeToOrgs,
  subscribeToProfiles,
  getDescendantOrgIds,
} from '../../lib/supabaseService';
import { subscribeToProjects, type Project } from '../services/projectService';
import { useAuth } from '../contexts/AuthContext';
import type { Organization, UserProfile, DashboardMetrics } from '../types';

// ─── useOrgs ─────────────────────────────────────────────────────
export function useOrgs() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchAllOrgs()
      .then((data) => {
        if (!cancelled) {
          setOrgs(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const unsub = subscribeToOrgs((data) => {
      if (!cancelled) setOrgs(data);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { orgs, loading };
}

// ─── useProfiles ─────────────────────────────────────────────────
export function useProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchAllProfiles()
      .then((data) => {
        if (!cancelled) {
          setProfiles(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const unsub = subscribeToProfiles((data) => {
      if (!cancelled) setProfiles(data);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  return { profiles, loading };
}

// ─── useDashboardMetrics ─────────────────────────────────────────
export function useDashboardMetrics(): { metrics: DashboardMetrics; loading: boolean } {
  const { profiles, loading: profilesLoading } = useProfiles();
  const { orgs, loading: orgsLoading } = useOrgs();

  const loading = profilesLoading || orgsLoading;

  const metrics: DashboardMetrics = useMemo(() => {
    const activeProfiles = profiles.filter((p) => p.is_active && p.role !== 'super_admin');
    const activeOrgs = orgs.filter((o) => o.is_active);
    const overloaded = activeProfiles.filter((p) => p.workload >= 80);
    const totalWorkload = activeProfiles.reduce((sum, p) => sum + p.workload, 0);
    const avgWorkload = activeProfiles.length > 0 ? Math.round(totalWorkload / activeProfiles.length) : 0;
    const deptHeads = activeProfiles.filter((p) => p.role === 'dept_head');

    return {
      totalUsers: activeProfiles.length,
      totalDepartments: activeOrgs.length,
      activeProjects: 0,
      activeTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      departmentHeads: deptHeads.length,
      overloadedEmployees: overloaded.length,
      averageWorkload: avgWorkload,
    };
  }, [profiles, orgs]);

  return { metrics, loading };
}

// ─── useProjectsData ─────────────────────────────────────────────
// Realtime operational projects. RLS already scopes what the server returns;
// this hook just wires the subscription into React.
export function useProjectsData() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeToProjects((data) => {
      if (!cancelled) {
        setProjects(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  return { projects, loading };
}

// ─── useScopedOrgIds ─────────────────────────────────────────────
// The current user's org plus every descendant (their subtree). Empty array
// means "no scope filter" (e.g. super admin) — callers treat empty as all.
export function useScopedOrgIds(): { scopedOrgIds: string[]; isSuperAdmin: boolean; orgs: Organization[] } {
  const { orgs } = useOrgs();
  const { userProfile } = useAuth();
  const isSuperAdmin = userProfile?.role === 'super_admin';

  const scopedOrgIds = useMemo(() => {
    if (isSuperAdmin) return [];
    return getDescendantOrgIds(orgs, userProfile?.org_id);
  }, [orgs, userProfile?.org_id, isSuperAdmin]);

  return { scopedOrgIds, isSuperAdmin, orgs };
}
