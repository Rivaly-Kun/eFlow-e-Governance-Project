// ─── Supabase Realtime Data Hooks ────────────────────────────────
// Wraps supabaseService subscriptions into clean React hooks.

import { useState, useEffect, useMemo } from 'react';
import {
  fetchAllOrgs,
  fetchAllProfiles,
  subscribeToOrgs,
  subscribeToProfiles,
} from '../../lib/supabaseService';
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
