<?php

namespace App\Services;

use App\Models\Mechanic;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class MechanicService
{
    public function getMechanics()
    {
        $per_page = request('perPage', 10);

        $sort = request('sort', ["column" => "name", "direction" => "asc"]);
        $search = request('search', '');

        $user_id = request('user_id', 'ALL');   // filter sa admin
        $branch_id = request('branch_id');      // branch sa user nga makita ang mechanics

        $column = match ($sort['column']) {
            'user.name' => User::query()->select('code')->whereColumn('users.id', 'mechanics.user_id'),
            default => $sort['column']
        };

        $hasUser = $user_id && $user_id !== 'ALL';
        $hasBranch = $branch_id && $branch_id !== 'ALL';

        return Mechanic::query()
            ->with('user:id,code,name')
            ->withCount('jobOrders')
            ->when($hasUser || $hasBranch, function ($query) use ($hasUser, $hasBranch, $user_id, $branch_id) {
                $query->where(function ($q) use ($hasUser, $hasBranch, $user_id, $branch_id) {
                    if ($hasUser) {
                        $q->orWhere('user_id', $user_id);
                    }
                    if ($hasBranch) {
                        $q->orWhere('user_id', $branch_id);
                    }
                });
            })
            ->when(
                $search,
                fn($query) => $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhereRelation('user', 'name', 'like', "%{$search}%")
                        ->orWhereRelation('user', 'code', 'like', "%{$search}%");
                })
            )
            ->orderBy($column, $sort['direction'])
            ->paginate($per_page, ['id', 'name', 'user_id']);
    }

    public function getBranchMechanics($user_id)
    {
        return Mechanic::query()
            ->where('user_id', $user_id)
            ->get(['id', 'name']);
    }

    public function store($request)
    {
        $mechanic = Mechanic::query()
            ->create([
                "name"    => Str::title($request->name),
                "user_id" => $request->user_id,
            ]);

        activity()
            ->causedBy(Auth::user())
            ->performedOn($mechanic)
            ->log("Added new mechanic {$mechanic->name} and assigned to {$mechanic->user->name} to system.");

        return $mechanic;
    }

    public function update($request, $mechanic)
    {
        $old_mechanic_name = $mechanic->name;

        $old_assigned_branch = $mechanic->user->name;

        $mechanic->update([
            "name"    => Str::title($request->name),
            "user_id" => $request->user_id,
        ]);

        activity()
            ->causedBy(Auth::user())
            ->performedOn($mechanic)
            ->log("Updated mechanic name from \"{$old_mechanic_name}\" to \"{$mechanic->name}\" and assigned from {$old_assigned_branch} to {$mechanic->user->name}.");

        return $mechanic;
    }

    public function delete($mechanic)
    {
        activity()
            ->causedBy(Auth::user())
            ->performedOn($mechanic)
            ->log("Deleted {$mechanic->name} mechanic that assigned from {$mechanic->user->name}.");

        return $mechanic->delete();
    }

    public function exportMechanics()
    {
        $userId = request('user_id', 'ALL');

        return Mechanic::query()
            ->with('user:id,code,name')
            ->withCount('jobOrders')
            ->when($userId && $userId !== 'ALL', fn($query) => $query->where('user_id', $userId))
            ->orderBy('name')
            ->get(['id', 'name', 'user_id'])
            ->map(fn($mechanic) => [
                'id'               => $mechanic->id,
                'name'             => $mechanic->name,
                'branch_code'      => $mechanic->user?->code,
                'branch_name'      => $mechanic->user?->name,
                'job_orders_count' => $mechanic->job_orders_count,
            ])
            ->values();
    }
}

