import { Copy, PenLine, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  STATUS_META,
  STATUS_ORDER,
  normalizeStatus,
  type EventStatus,
} from "@/lib/calendar";
import type { CalEvent } from "@/lib/types";

interface EventContextMenuProps {
  event: CalEvent;
  onOpen: () => void;
  onDuplicate: () => void;
  onStatusChange: (status: EventStatus) => void;
  onDelete: () => void;
  children: React.ReactNode;
}

/**
 * Right-click surface for a calendar event tile. Exposes the four
 * actions the user most often reaches for without having to open the
 * full event modal: edit (same as click), duplicate, change status,
 * and delete. Re-used across month, week, agenda, and kanban views
 * so the keyboard-free flow is consistent.
 */
export function EventContextMenu({
  event,
  onOpen,
  onDuplicate,
  onStatusChange,
  onDelete,
  children,
}: EventContextMenuProps) {
  const currentStatus = normalizeStatus(event.status);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onOpen}>
          <PenLine />
          <span>Edit event</span>
        </ContextMenuItem>
        <ContextMenuItem onSelect={onDuplicate}>
          <Copy />
          <span>Duplicate</span>
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_META[currentStatus].dot }}
            />
            <span>Status: {STATUS_META[currentStatus].label}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuLabel>Change status</ContextMenuLabel>
            <ContextMenuRadioGroup
              value={currentStatus}
              onValueChange={(v) => onStatusChange(v as EventStatus)}
            >
              {STATUS_ORDER.map((s) => (
                <ContextMenuRadioItem key={s} value={s}>
                  <span
                    aria-hidden
                    className="mr-1 inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_META[s].dot }}
                  />
                  {STATUS_META[s].label}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          <span>Delete event</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
