import { useState, useMemo } from "react";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "./ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { getPricingData, type BedrockModel } from "./pricing-data";
import { Search, ArrowUpDown, Filter, Zap } from "lucide-react";

type UnitMode = "1k" | "1m";
type SortField = "name" | "input" | "output" | "cache_write" | "cache_write_1hour" | "cache_read" | "batch_input";
type SortDir = "asc" | "desc";

const providerColors: Record<string, string> = {
  Anthropic: "bg-primary text-primary-foreground",
  Amazon: "bg-secondary text-secondary-foreground",
};

function formatPrice(price: number | null, unit: UnitMode): string {
  if (price === null) return "\u2014";
  const value = unit === "1m" ? price * 1000 : price;
  if (value < 0.001) return `$${value.toFixed(6)}`;
  if (value < 0.01) return `$${value.toFixed(5)}`;
  if (value < 0.1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(3)}`;
}

function findMinInColumn(
  models: BedrockModel[],
  getter: (m: BedrockModel) => number | null
): number | null {
  const values = models.map(getter).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return Math.min(...values);
}

export function PricingMatrix() {
  const pricingData = getPricingData();

  const [unit, setUnit] = useState<UnitMode>("1m");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCachingOnly, setShowCachingOnly] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const providers = useMemo(
    () => Array.from(new Set(pricingData.models.map((m) => m.provider))),
    [pricingData]
  );

  const filteredModels = useMemo(() => {
    let models = [...pricingData.models];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      models = models.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q)
      );
    }

    if (showCachingOnly) {
      models = models.filter((m) => m.constraints.supports_caching);
    }

    if (providerFilter !== "all") {
      models = models.filter((m) => m.provider === providerFilter);
    }

    models.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "input":
          cmp = a.pricing.input_1k - b.pricing.input_1k;
          break;
        case "output":
          cmp = a.pricing.output_1k - b.pricing.output_1k;
          break;
        case "cache_write":
          cmp = (a.pricing.cache_write_1k ?? Infinity) - (b.pricing.cache_write_1k ?? Infinity);
          break;
        case "cache_write_1hour":
          cmp = (a.pricing.cache_write_1hour_1k ?? Infinity) - (b.pricing.cache_write_1hour_1k ?? Infinity);
          break;
        case "cache_read":
          cmp = (a.pricing.cache_read_1k ?? Infinity) - (b.pricing.cache_read_1k ?? Infinity);
          break;
        case "batch_input":
          cmp = (a.pricing.batch_input_1k ?? Infinity) - (b.pricing.batch_input_1k ?? Infinity);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return models;
  }, [pricingData, searchQuery, showCachingOnly, providerFilter, sortField, sortDir]);

  const mins = useMemo(
    () => ({
      input: findMinInColumn(filteredModels, (m) => m.pricing.input_1k),
      output: findMinInColumn(filteredModels, (m) => m.pricing.output_1k),
      cache_write: findMinInColumn(filteredModels, (m) => m.pricing.cache_write_1k),
      cache_write_1hour: findMinInColumn(filteredModels, (m) => m.pricing.cache_write_1hour_1k),
      cache_read: findMinInColumn(filteredModels, (m) => m.pricing.cache_read_1k),
      batch_input: findMinInColumn(filteredModels, (m) => m.pricing.batch_input_1k),
      batch_output: findMinInColumn(filteredModels, (m) => m.pricing.batch_output_1k),
    }),
    [filteredModels]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className="ml-auto flex items-center gap-1 text-xs font-semibold hover:text-primary transition-colors cursor-pointer"
    >
      {children}
      <ArrowUpDown
        className={`w-3 h-3 ${sortField === field ? "text-primary" : "text-muted-foreground"}`}
      />
    </button>
  );

  const isMin = (val: number | null, minVal: number | null) =>
    val !== null && minVal !== null && val === minVal;

  return (
    <div className="space-y-6">
      <div>
        <h2>Pricing Matrix</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Apples-to-apples comparison of AWS Bedrock model pricing. Green cells indicate the lowest cost in each column.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="flex-1 min-w-0 w-full lg:w-auto">
              <Label htmlFor="search" className="mb-1.5">Search Models</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, provider, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full lg:w-48">
              <Label className="mb-1.5">Provider</Label>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full lg:w-auto">
              <Label className="mb-1.5">Unit</Label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <Button
                  variant={unit === "1k" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setUnit("1k")}
                  className="rounded-none text-xs"
                >
                  Per 1K
                </Button>
                <Button
                  variant={unit === "1m" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setUnit("1m")}
                  className="rounded-none text-xs"
                >
                  Per 1M
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 pb-0.5">
              <Switch
                id="cache-filter"
                checked={showCachingOnly}
                onCheckedChange={setShowCachingOnly}
              />
              <Label htmlFor="cache-filter" className="whitespace-nowrap cursor-pointer">
                <Filter className="w-3.5 h-3.5 inline mr-1" />
                Caching Only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs font-medium">Total Models</p>
            <p className="text-foreground mt-1 text-xl font-medium">{filteredModels.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs font-medium">Caching Support</p>
            <p className="text-foreground mt-1 text-xl font-medium">
              {filteredModels.filter((m) => m.constraints.supports_caching).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs font-medium">Cheapest Input</p>
            <p className="text-foreground mt-1 text-xl font-medium">
              {mins.input !== null ? formatPrice(mins.input, unit) : "\u2014"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-muted-foreground text-xs font-medium">Providers</p>
            <p className="text-foreground mt-1 text-xl font-medium">
              {new Set(filteredModels.map((m) => m.provider)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Model Pricing ({unit === "1k" ? "Per 1K Tokens" : "Per 1M Tokens"})
          </CardTitle>
          <CardDescription className="text-sm">
            {filteredModels.length} model{filteredModels.length !== 1 ? "s" : ""} shown
            {showCachingOnly && " \u00B7 Filtered to caching-capable models"}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">
                  <SortableHeader field="name">Model</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="input">Input</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="output">Output</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="cache_write">Cache Write (5 min)</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="cache_write_1hour">Cache Write (1 hr)</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="cache_read">Cache Read</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="batch_input">Batch In</SortableHeader>
                </TableHead>
                <TableHead className="text-right text-xs font-semibold">Batch Out</TableHead>
                <TableHead className="text-center text-xs font-semibold">Features</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.map((model) => (
                <TableRow key={model.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{model.name}</span>
                      <Badge
                        variant="outline"
                        className={`${providerColors[model.provider] || "bg-muted text-foreground"} border-none`}
                      >
                        {model.provider}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm ${
                      isMin(model.pricing.input_1k, mins.input)
                        ? "bg-green-100 dark:bg-green-900/30 font-semibold"
                        : ""
                    }`}
                  >
                    {formatPrice(model.pricing.input_1k, unit)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm ${
                      isMin(model.pricing.output_1k, mins.output)
                        ? "bg-green-100 dark:bg-green-900/30 font-semibold"
                        : ""
                    }`}
                  >
                    {formatPrice(model.pricing.output_1k, unit)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm ${
                      isMin(model.pricing.cache_write_1k, mins.cache_write)
                        ? "bg-green-100 dark:bg-green-900/30 font-semibold"
                        : ""
                    }`}
                  >
                    {formatPrice(model.pricing.cache_write_1k, unit)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm ${
                      isMin(model.pricing.cache_write_1hour_1k, mins.cache_write_1hour)
                        ? "bg-green-100 dark:bg-green-900/30 font-semibold"
                        : ""
                    }`}
                  >
                    {formatPrice(model.pricing.cache_write_1hour_1k, unit)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm ${
                      isMin(model.pricing.cache_read_1k, mins.cache_read)
                        ? "bg-green-100 dark:bg-green-900/30 font-semibold"
                        : ""
                    }`}
                  >
                    {formatPrice(model.pricing.cache_read_1k, unit)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm ${
                      isMin(model.pricing.batch_input_1k, mins.batch_input)
                        ? "bg-green-100 dark:bg-green-900/30 font-semibold"
                        : ""
                    }`}
                  >
                    {formatPrice(model.pricing.batch_input_1k, unit)}
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm ${
                      isMin(model.pricing.batch_output_1k, mins.batch_output)
                        ? "bg-green-100 dark:bg-green-900/30 font-semibold"
                        : ""
                    }`}
                  >
                    {formatPrice(model.pricing.batch_output_1k, unit)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {model.constraints.supports_caching && (
                        <Badge variant="outline" className="border-primary text-primary text-xs">
                          <Zap className="w-3 h-3 mr-0.5" />
                          Cache
                        </Badge>
                      )}
                      {model.constraints.supports_vision && (
                        <Badge variant="outline" className="border-secondary text-secondary text-xs">
                          Vision
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredModels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      No models match your filters. Try adjusting your search criteria.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
