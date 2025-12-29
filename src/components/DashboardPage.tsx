"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, Mail, MessageSquare, Star, TrendingUp,TrendingDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Summary = {
  reviewTotal: number;
  reviewWeekCount: number;
  reviewTrendDelta: number;
  reviewTrendPercent: number;
  avgRating: number;
  contactTotal: number;
  contactWeekCount: number;
  contactTrendDelta: number;
  contactTrendPercent: number;
  activeUsers: number;
};

type TrendPoint = {
  date: string;
  reviews: number;
  contacts: number;
};

type RatingPoint = {
  rating: number;
  count: number;
};

type SubjectPoint = {
  subject: string;
  count: number;
};

type ActivityItem = {
  id: string;
  type: "review" | "contact";
  name: string;
  email: string;
  content: string;
  createdAt: string;
};

type DashboardData = {
  summary: Summary;
  trend7d: TrendPoint[];
  ratingDistribution: RatingPoint[];
  contactSubjects: SubjectPoint[];
  recentActivity: ActivityItem[];
};

const formatDateShort = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, "0")}`;
};

const formatDateRelative = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "今天";
  return `${days}天前`;
};

const emptySummary: Summary = {
  reviewTotal: 0,
  reviewWeekCount: 0,
  reviewTrendDelta: 0,
  reviewTrendPercent: 0,
  avgRating: 0,
  contactTotal: 0,
  contactWeekCount: 0,
  contactTrendDelta: 0,
  contactTrendPercent: 0,
  activeUsers: 0,
};

const pieColors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let isActive = true;
    const loadDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) return;
        const payload = await response.json();
        if (!isActive) return;
        setData(payload);
      } catch (error) {
        // Ignore load failures for now.
      }
    };

    loadDashboard();
    return () => {
      isActive = false;
    };
  }, []);

  const summary = data?.summary ?? emptySummary;
  const trend = data?.trend7d ?? [];
  const ratingDistribution = data?.ratingDistribution ?? [];
  const subjectDistribution = data?.contactSubjects ?? [];
  const activity = data?.recentActivity ?? [];

  const pieData = useMemo(() => {
    return subjectDistribution.map((item) => ({
      name: item.subject,
      value: item.count,
    }));
  }, [subjectDistribution]);

  const pieTotal = useMemo(
    () => pieData.reduce((sum, item) => sum + item.value, 0),
    [pieData],
  );

  const formatTrend = (value: number) => {
    return `${Math.abs(value).toFixed(0)}%`;
  };

  const formatDelta = (value: number) => {
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    return `${sign}${Math.abs(value)}`;
  };

  const getSatisfactionLabel = (score: number) => {
    if (score < 1.5) return "非常不满意";
    if (score < 2.5) return "不太满意";
    if (score < 3.5) return "基本满意";
    if (score < 4.5) return "满意";
    return "非常满意";
  };

  const getTrendIcon = (value: number) => (value < 0 ? TrendingDown : TrendingUp);

  return (
    <div className="flex w-full min-w-0 flex-col items-start">
      <div className="flex min-h-[1413px] w-full flex-col gap-8 px-8 pb-8 pt-8">
        <div className="flex w-full flex-col gap-2">
          <div className="text-[20px] font-medium leading-[30px] tracking-[-0.4492px] text-[#101828]">
            数据仪表盘
          </div>
          <div className="text-[16px] tracking-[-0.3125px] text-[#4a5565]">实时监控关键业务指标</div>
        </div>

        <div className="grid h-[194px] w-full grid-cols-4 gap-6">
          <div className="relative rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex m-6 h-12 items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#dbeafe]">
                <MessageSquare className="h-6 w-6 text-[#155dfc]" strokeWidth={1.8} />
              </div>
              <div className="flex h-5 gap-1">
                {(() => {
                const TrendIcon = getTrendIcon(summary.reviewTrendPercent);
                return (
                  <TrendIcon
                    className={`h-4 w-4 ${summary.reviewTrendPercent < 0 ? "text-[#e7000b]" : "text-[#00a63e]"}`}
                    strokeWidth={2}
                  />
                );
              })()}
                <span
                className={`text-[14px] tracking-[-0.1504px] ${
                  summary.reviewTrendPercent < 0 ? "text-[#e7000b]" : "text-[#00a63e]"
                }`}
              >
                {formatTrend(summary.reviewTrendPercent)}
              </span>
              </div>
            </div>
            <div className="absolute left-6 top-[88px] text-[16px] tracking-[-0.3125px] text-[#4a5565]">总评论数</div>
            <div className="absolute left-6 top-[116px] text-[16px] tracking-[-0.3125px] text-[#101828]">
              {summary.reviewTotal}
            </div>
            <div className="absolute left-6 top-[148px] text-[14px] tracking-[-0.1504px] text-[#6a7282]">
              本周新增 {summary.reviewWeekCount}
            </div>
          </div>

          <div className="relative rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex m-6 h-12 items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#fef9c2]">
                <Star className="h-6 w-6 text-[#f59e0b]" strokeWidth={1.8} />
              </div>
              <div className="text-[14px] tracking-[-0.1504px] text-[#4a5565]">满意度</div>
            </div>
            <div className="absolute left-6 top-[88px] text-[16px] tracking-[-0.3125px] text-[#4a5565]">平均评分</div>
            <div className="absolute left-6 top-[116px] text-[16px] tracking-[-0.3125px] text-[#101828]">
              {summary.avgRating.toFixed(1)} / 5.0
            </div>
            <div className="absolute left-6 top-[148px] text-[14px] tracking-[-0.1504px] text-[#6a7282]">
              {getSatisfactionLabel(summary.avgRating)}
            </div>
          </div>

          <div className="relative rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex m-6 h-12 items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#f3e8ff]">
                <Mail className="h-6 w-6 text-[#7c3aed]" strokeWidth={1.8} />
              </div>
              <div className="flex relative h-5 gap-1">
                {(() => {
                const TrendIcon = getTrendIcon(summary.contactTrendPercent);
                return (
                  <TrendIcon
                    className={`h-4 w-4 ${summary.contactTrendPercent < 0 ? "text-[#e7000b]" : "text-[#00a63e]"}`}
                    strokeWidth={2}
                  />
                );
              })()}
                <span
                className={`text-[14px] tracking-[-0.1504px] ${
                  summary.contactTrendPercent < 0 ? "text-[#e7000b]" : "text-[#00a63e]"
                }`}
              >
              {formatTrend(summary.contactTrendPercent)}
              </span>
              </div>
            </div>
            <div className="absolute left-6 top-[88px] text-[16px] tracking-[-0.3125px] text-[#4a5565]">总联系数</div>
            <div className="absolute left-6 top-[116px] text-[16px] tracking-[-0.3125px] text-[#101828]">
              {summary.contactTotal}
            </div>
            <div className="absolute left-6 top-[148px] text-[14px] tracking-[-0.1504px] text-[#6a7282]">
              本周新增 {summary.contactWeekCount}
            </div>
          </div>

          <div className="relative rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex m-6 h-12 items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#dcfce7]">
                <Activity className="h-6 w-6 text-[#16a34a]" strokeWidth={1.8} />
              </div>
              <div className="text-[14px] tracking-[-0.1504px] text-[#4a5565]">活跃度</div>
            </div>
            <div className="absolute left-6 top-[88px] text-[16px] tracking-[-0.3125px] text-[#4a5565]">活跃用户</div>
            <div className="absolute left-6 top-[116px] text-[16px] tracking-[-0.3125px] text-[#101828]">
              {summary.activeUsers}
            </div>
            <div className="absolute left-6 top-[148px] text-[14px] tracking-[-0.1504px] text-[#6a7282]">最近7天互动</div>
          </div>
        </div>

        <div className="grid h-[351px] w-full grid-cols-2 gap-6">
          <div className="flex flex-col gap-6 rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="text-[18px] font-medium leading-[27px] tracking-[-0.4395px] text-[#101828]">7天数据趋势</div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDateShort} stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                    formatter={(value) => String(value ?? "")}
                    labelFormatter={(label) => `日期 ${formatDateShort(label)}`}
                  />
                  <Legend verticalAlign="top" height={24} iconType="circle" />
                  <Line type="monotone" dataKey="reviews" name="评论" stroke="#155dfc" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="contacts" name="联系" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="text-[18px] font-medium leading-[27px] tracking-[-0.4395px] text-[#101828]">评分分布</div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingDistribution} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="rating" stroke="#6b7280" fontSize={12} tickFormatter={(value) => `${value}星`} />
                  <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                    formatter={(value) => [`${value ?? ""}`, "数量"]}
                  />
                  <Bar dataKey="count" fill="#155dfc" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="relative h-[646px] w-full min-w-0 overflow-x-hidden">
          <div className="relative h-[646px] grid grid-cols-[362px_1fr] gap-4">
            <div className="flex flex-col gap-6 rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              <div className="text-[18px] font-medium leading-[27px] tracking-[-0.4395px] text-[#101828]">联系主题分布</div>
              <div className="relative h-[244px] w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      innerRadius={40}
                      paddingAngle={2}
                      label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                      formatter={(value) => [`${value ?? ""}`, "数量"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 text-[12px] text-[#6b7280]">
                {pieData.map((item, index) => {
                  const percent = pieTotal ? Math.round((item.value / pieTotal) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-2 w-2 rounded-full"
                          style={{ backgroundColor: pieColors[index % pieColors.length] }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span>
                        {item.value} ({percent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-6 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white px-[25px] pb-px pt-[25px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
              <div className="text-[16px] tracking-[-0.3125px] text-[#101828]">最近活动</div>
              <div className="flex w-full min-w-0 flex-col gap-4">
                {activity.map((item) => {
                  const isContact = item.type === "contact";
                  return (
                    <div key={item.id} className="flex min-h-[97px] w-full gap-4 border-b border-[#f3f4f6] pb-4 last:border-b-0">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-[10px] ${
                          isContact ? "bg-[#f3e8ff]" : "bg-[#dbeafe]"
                        }`}
                      >
                        {isContact ? (
                          <Mail className="h-5 w-5 text-[#7c3aed]" strokeWidth={1.8} />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-[#2563eb]" strokeWidth={1.8} />
                        )}
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <div className="flex h-6 items-center justify-between">
                          <span className="text-[16px] tracking-[-0.3125px] text-[#101828]">
                            {item.name}
                          </span>
                          <span className="relative flex items-center gap-1 text-[14px] tracking-[-0.1504px] text-[#6a7282]">
                            <Clock className="h-3 w-3" strokeWidth={1.8} />
                            {formatDateRelative(item.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 text-[14px] tracking-[-0.1504px] text-[#4a5565] break-words">
                          {item.content}
                        </div>
                        <div
                          className={`mt-2 inline-flex h-6 items-center rounded-[16777200px] px-2 text-[12px] ${
                            isContact
                              ? "bg-[#faf5ff] text-[#8200db]"
                              : "bg-[#eff6ff] text-[#1447e6]"
                          }`}
                        >
                          {isContact ? "联系信息" : "用户评论"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
