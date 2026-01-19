import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Briefcase, 
  Mail, 
  Calendar as CalendarIcon,
  TrendingUp,
  Clock,
  Target,
  Plus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusColors = {
  applied: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  interviewing: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  offer: "bg-green-500/10 text-green-500 border-green-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  withdrawn: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const statusIcons = {
  applied: Clock,
  interviewing: AlertCircle,
  offer: CheckCircle2,
  rejected: XCircle,
  withdrawn: XCircle,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const quickActions = [
    { to: "/dashboard/resumes", icon: FileText, label: "Add Resume", color: "text-blue-500" },
    { to: "/dashboard/applications", icon: Briefcase, label: "Track Job", color: "text-green-500" },
    { to: "/dashboard/cover-letters", icon: Mail, label: "Generate Letter", color: "text-purple-500" },
    { to: "/dashboard/calendar", icon: CalendarIcon, label: "Schedule", color: "text-orange-500" },
  ];

  if (loading) {
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your job search progress
          </p>
        </div>
        <Link to="/dashboard/applications">
          <Button data-testid="add-application-btn">
            <Plus className="mr-2 h-4 w-4" />
            Add Application
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50" data-testid="stat-total-applications">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
                <p className="text-3xl font-bold mt-1">{analytics?.total_applications || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="stat-response-rate">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-3xl font-bold mt-1">{analytics?.response_rate || 0}%</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <Progress value={analytics?.response_rate || 0} className="mt-3 h-1.5" />
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="stat-resumes">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resumes</p>
                <p className="text-3xl font-bold mt-1">{analytics?.resume_count || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50" data-testid="stat-cover-letters">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cover Letters</p>
                <p className="text-3xl font-bold mt-1">{analytics?.cover_letter_count || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <Card className="lg:col-span-2 border-border/50" data-testid="recent-applications-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Applications</CardTitle>
              <CardDescription>Your latest job applications</CardDescription>
            </div>
            <Link to="/dashboard/applications">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {analytics?.recent_applications?.length > 0 ? (
              <div className="space-y-4">
                {analytics.recent_applications.map((app) => {
                  const StatusIcon = statusIcons[app.status] || Clock;
                  return (
                    <div 
                      key={app.id} 
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      data-testid={`recent-app-${app.id}`}
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {app.company?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{app.position}</p>
                        <p className="text-sm text-muted-foreground truncate">{app.company}</p>
                      </div>
                      <Badge variant="outline" className={statusColors[app.status]}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {app.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {formatDate(app.applied_date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No applications yet</p>
                <Link to="/dashboard/applications">
                  <Button variant="link" className="mt-2">Add your first application</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-border/50" data-testid="quick-actions-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to}>
                  <Button 
                    variant="outline" 
                    className="w-full h-auto py-4 flex-col gap-2 hover:border-primary/50"
                    data-testid={`quick-action-${action.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border-border/50" data-testid="upcoming-events-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Upcoming</CardTitle>
              <Link to="/dashboard/calendar">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {analytics?.upcoming_events?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.upcoming_events.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`upcoming-event-${event.id}`}
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.start_date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          {analytics?.status_breakdown && Object.keys(analytics.status_breakdown).length > 0 && (
            <Card className="border-border/50" data-testid="status-breakdown-card">
              <CardHeader>
                <CardTitle className="text-lg">By Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(analytics.status_breakdown).map(([status, count]) => {
                  const StatusIcon = statusIcons[status] || Clock;
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{status}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
