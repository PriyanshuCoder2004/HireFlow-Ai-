import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Target, 
  Sparkles, 
  Calendar, 
  BarChart3, 
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
  Zap
} from "lucide-react";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      icon: FileText,
      title: "AI Resume Analysis",
      description: "Get instant feedback and scoring on your resume with actionable insights to stand out."
    },
    {
      icon: Target,
      title: "Job Matching",
      description: "See how well your resume matches job descriptions and get personalized improvement tips."
    },
    {
      icon: Sparkles,
      title: "Cover Letter Generator",
      description: "Create tailored cover letters in seconds using AI that understands your experience."
    },
    {
      icon: Calendar,
      title: "Interview Scheduler",
      description: "Track all your interviews and important dates in one organized calendar view."
    },
    {
      icon: BarChart3,
      title: "Application Analytics",
      description: "Monitor your job search progress with detailed statistics and insights."
    },
    {
      icon: Zap,
      title: "Quick Apply Tracking",
      description: "Never lose track of where you applied with our streamlined application manager."
    }
  ];

  const stats = [
    { value: "85%", label: "Higher Response Rate" },
    { value: "3x", label: "Faster Job Search" },
    { value: "50+", label: "Resume Templates" },
    { value: "10k+", label: "Users Hired" }
  ];

  return (
    <div className="min-h-screen bg-background transition-theme">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">HireFlow</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              data-testid="theme-toggle-btn"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button data-testid="go-to-dashboard-btn">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" data-testid="login-btn">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button data-testid="register-btn">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                AI-Powered Job Search Platform
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.1]">
                Land Your Dream Job{" "}
                <span className="gradient-text">Faster</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                HireFlow AI analyzes your resume, matches you with perfect jobs, 
                and generates tailored cover letters — all in one powerful platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto text-base px-8" data-testid="hero-get-started-btn">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" data-testid="hero-signin-btn">
                    Sign In
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-6 pt-4">
                {[].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50">
                <img 
                  src="https://images.pexels.com/photos/35334354/pexels-photo-35334354.jpeg"
                  alt="Professional ready for success"
                  className="w-full h-auto object-cover aspect-[4/5]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>
              
              {/* Floating stat cards */}
              <div className="absolute -left-8 top-1/4 p-4 rounded-xl glass border border-border/50 shadow-lg animate-fade-in-up">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Target className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">92%</p>
                    <p className="text-xs text-muted-foreground">Match Score</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -right-4 bottom-1/4 p-4 rounded-xl glass border border-border/50 shadow-lg animate-fade-in-up animation-delay-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">A+</p>
                    <p className="text-xs text-muted-foreground">Resume Score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 border-y border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything You Need to Land the Job
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From resume analysis to interview prep, HireFlow AI has all the tools to accelerate your job search.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="group p-6 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-purple-500/10 border border-border/50">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Ready to Transform Your Job Search?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of professionals who've landed their dream jobs with HireFlow AI.
            </p>
            <Link to="/register">
              <Button size="lg" className="text-base px-10" data-testid="cta-get-started-btn">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">HireFlow AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 HireFlow AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
